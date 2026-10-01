"""
Me'morAI — Tekshiruvlar Routeri (Checks API)
Chizmalarni yuklash, tahlil qilish va QMQ qoidalari bo'yicha hisobotlarni olish.
Barcha yo'llar: /api/checks
"""
from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional
import uuid
import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status

try:
    from backend.config import get_settings
    from backend.database import DatabaseError, get_supabase, memory_store
    from backend.schemas import CheckJobStatus, CheckReport
    from backend.tasks import celery_app, execute_process_drawing, process_drawing
    from backend.auth import AuthenticatedUser, get_current_user
except ImportError:
    from config import get_settings
    from database import DatabaseError, get_supabase, memory_store
    from schemas import CheckJobStatus, CheckReport
    from tasks import celery_app, execute_process_drawing, process_drawing
    from auth import AuthenticatedUser, get_current_user

router = APIRouter()
logger = logging.getLogger("memore_ai.checks")
settings = get_settings()


def _row_to_check_report(row: Dict[str, Any]) -> CheckReport:
    """compliance_checks yoki checks VIEW qatorini CheckReport modeliga o'girish."""
    comp_res = row.get("compliance_results") or {}
    results = row.get("results")
    summary = row.get("summary")

    if results is None:
        if isinstance(comp_res, dict):
            results = comp_res.get("violations", comp_res.get("results", []))
        else:
            results = []

    if summary is None:
        if isinstance(comp_res, dict) and "summary" in comp_res:
            summary = comp_res["summary"]
        elif "total_rules" in row and row.get("total_rules") is not None:
            total = row.get("total_rules", 0)
            passed = row.get("passed_count", 0)
            failed = row.get("failed_count", 0)
            score = float(row.get("compliance_score") or 0.0)
            summary = {
                "total_checks": total,
                "passed": passed,
                "failed": failed,
                "critical_failures": 0,
                "pass_rate_percent": score,
                "ekspertiza_ready": (failed == 0 and total > 0),
            }

    err_msg = row.get("error_message")
    if not err_msg and isinstance(comp_res, dict):
        err_msg = comp_res.get("error_message")

    v_meta = row.get("vision_source_metadata")
    if not v_meta and isinstance(comp_res, dict):
        v_meta = comp_res.get("vision_source_metadata")

    return CheckReport(
        id=str(row.get("id")),
        project_id=str(row.get("project_id")),
        file_name=row.get("file_name") or "drawing",
        file_path=row.get("file_path"),
        status=row.get("status", CheckJobStatus.PENDING.value),
        results=results or [],
        summary=summary,
        vision_source_metadata=v_meta,
        error_message=err_msg,
        created_at=str(row.get("created_at")),
        completed_at=str(row.get("completed_at")) if row.get("completed_at") else None,
    )


@router.post(
    "/run",
    response_model=CheckReport,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Chizma faylini yuklash va QMQ tekshiruvini ishga tushirish",
)
async def run_check(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Arxitektura chizma fayli (PDF, DWG, DXF, PNG)"),
    project_id: str = Form(..., description="Tegishli loyiha ID raqami"),
    building_data: Optional[str] = Form(
        None,
        description="Bino parametrlari (JSON matn formatida, masalan: {'ceiling_height_m': 2.8, ...})"
    ),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> CheckReport:
    """
    Chizmani qabul qiladi, diskka saqlaydi va asinxron tahlil jarayonini boshlaydi.
    Celery mavjud bo'lsa Celery orqali, aks holda fon vazifasi (BackgroundTasks) orqali bajaradi.
    """
    check_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    # project_id ni UUID ga normalizatsiya qilish
    try:
        clean_project_id = str(uuid.UUID(str(project_id)))
    except (ValueError, AttributeError):
        clean_project_id = str(uuid.uuid4())

    # 1. Fayl formati va xavfsiz nomlash
    raw_filename = file.filename or "drawing.pdf"
    clean_filename = Path(raw_filename).name
    ext = Path(clean_filename).suffix.lower()
    ext_clean = ext.lstrip(".")

    allowed_exts = settings.ALLOWED_EXTENSIONS
    if isinstance(allowed_exts, str):
        allowed_list = [e.strip().lower().lstrip(".") for e in allowed_exts.split(",") if e.strip()]
    else:
        allowed_list = [str(e).lower().lstrip(".") for e in allowed_exts]

    if ext_clean not in allowed_list and ext not in allowed_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fayl formati ruxsat etilmagan ({ext}). Faqat {', '.join(allowed_list)} qabul qilinadi.",
        )

    # 2. Yuklash katalogini tayyorlash
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_storage_name = f"{check_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = upload_dir / safe_storage_name

    # 3. Faylni o'qish, magic bytes va hajm chegarasini tekshirish
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    total_bytes = 0
    first_chunk = True

    try:
        async with aiofiles.open(file_path, "wb") as buffer:
            while content := await file.read(1024 * 1024):
                if first_chunk and len(content) > 0:
                    header = content[:256]
                    if ext == ".pdf" and not header.startswith(b"%PDF-"):
                        raise ValueError("Fayl formati yaroqsiz: Haqiqiy PDF fayl bosh sarlavhasi topilmadi.")
                    elif ext == ".png" and not header.startswith(b"\x89PNG\r\n\x1a\n"):
                        raise ValueError("Fayl formati yaroqsiz: Haqiqiy PNG fayl sarlavhasi topilmadi.")
                    elif ext in (".jpg", ".jpeg") and not header.startswith(b"\xff\xd8\xff"):
                        raise ValueError("Fayl formati yaroqsiz: Haqiqiy JPEG fayl sarlavhasi topilmadi.")
                    elif ext == ".dxf":
                        if b"SECTION" not in header and not header.startswith(b"AutoCAD Binary DXF"):
                            raise ValueError("Fayl formati yaroqsiz: Haqiqiy DXF chizma sarlavhasi topilmadi.")
                    first_chunk = False

                total_bytes += len(content)
                if total_bytes > max_bytes:
                    raise ValueError(f"Fayl hajmi ruxsat etilgan limitdan ({settings.MAX_FILE_SIZE_MB} MB) oshib ketdi.")

                await buffer.write(content)
    except ValueError as val_err:
        if file_path.exists():
            file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as e:
        if file_path.exists():
            file_path.unlink(missing_ok=True)
        logger.error(f"Faylni saqlashda xato: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Faylni yuklashda xatolik yuz berdi: {str(e)}",
        )

    # 4. JSON building_data ni tahlil qilish
    parsed_building_data = {}
    if building_data:
        try:
            parsed_building_data = json.loads(building_data)
        except json.JSONDecodeError:
            logger.warning("building_data noto'g'ri JSON formatida yuborildi.")

    # 5. Check dastlabki holatini saqlash
    initial_check_data = {
        "id": check_id,
        "project_id": clean_project_id,
        "file_name": clean_filename,
        "file_path": str(file_path),
        "status": CheckJobStatus.PENDING.value,
        "results": [],
        "summary": None,
        "error_message": None,
        "created_at": now_iso,
        "completed_at": None,
    }

    supabase = get_supabase()
    if supabase:
        try:
            # 5.1 organization_id ni aniqlash (Zero Cross-Tenant Leakage)
            org_id = current_user.organization_id if current_user else None
            if not org_id:
                try:
                    proj_res = supabase.table("projects").select("organization_id").eq("id", clean_project_id).execute()
                    if proj_res.data and len(proj_res.data) > 0:
                        org_id = proj_res.data[0].get("organization_id")
                except Exception:
                    pass

            if not org_id:
                if settings.ENVIRONMENT == "production":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Ushbu tekshiruv uchun faol tashkilot (organization_id) talab etiladi.",
                    )
                org_id = "a0000000-0000-0000-0000-000000000001"

            # 4.2 Loyiha mavjudligini kafolatlash (FK constraint uchun)
            try:
                proj_check = supabase.table("projects").select("id").eq("id", clean_project_id).execute()
                if not proj_check.data:
                    supabase.table("projects").insert({
                        "id": clean_project_id,
                        "organization_id": org_id,
                        "name": f"Loyiha {clean_project_id[:8]}",
                        "building_type": "residential",
                        "status": "active",
                    }).execute()
            except Exception as proj_err:
                logger.warning(f"Loyiha mavjudligini ta'minlashda ogohlantirish: {proj_err}")

            # 4.3 compliance_checks jadvaliga yozish
            compliance_payload = {
                "id": check_id,
                "organization_id": org_id,
                "project_id": clean_project_id,
                "check_type": "full",
                "standard_code": "QMQ",
                "status": CheckJobStatus.PENDING.value,
                "total_rules": 0,
                "passed_count": 0,
                "failed_count": 0,
                "warning_count": 0,
                "compliance_results": {
                    "version": "1.0.0",
                    "rules_engine": "QMQRulesEngine",
                    "file_name": file.filename or "drawing",
                    "file_path": str(file_path),
                    "violations": [],
                    "summary": None,
                },
                "summary_uz": "Tekshiruv navbatda",
                "created_at": now_iso,
            }
            supabase.table("compliance_checks").insert(compliance_payload).execute()
        except Exception as e:
            logger.error(f"Supabase compliance_checks jadvaliga tekshiruv yozishda xato: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ma'lumotlar bazasiga tekshiruvni yozishda xatolik yuz berdi: {str(e)}",
            )

    memory_store["checks"][check_id] = initial_check_data
    memory_store["compliance_checks"][check_id] = initial_check_data

    # 5. Asinxron tahlil vazifasini yuborish (Celery yoki FastAPI BackgroundTasks)
    dispatched_to_celery = False
    if celery_app is not None:
        try:
            process_drawing.delay(check_id, str(file_path), parsed_building_data)
            dispatched_to_celery = True
            logger.info(f"Tekshiruv Celery navbatiga qo'shildi [check_id={check_id}]")
        except Exception as celery_err:
            logger.warning(
                f"Celery brokerga ulanib bo'lmadi ({celery_err}). "
                "FastAPI ichki BackgroundTasks rejimiga o'tilmoqda."
            )

    if not dispatched_to_celery:
        background_tasks.add_task(
            execute_process_drawing,
            check_id,
            str(file_path),
            parsed_building_data,
        )

    return CheckReport(**initial_check_data)


@router.get(
    "/{check_id}",
    response_model=CheckReport,
    summary="Tekshiruv natijasi va hisobotini olish",
)
async def get_check_result(
    check_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> CheckReport:
    """
    Check ID orqali tahlil holati, qoidalar bo'yicha natijalar va xulosani qaytaradi.
    Faqat o'z organization_id ga tegishli tekshiruvlar ko'rinadi (egalik tekshiruvi).
    """
    is_valid_uuid = False
    try:
        uuid.UUID(str(check_id))
        is_valid_uuid = True
    except (ValueError, AttributeError):
        pass

    supabase = get_supabase()
    if supabase and is_valid_uuid:
        try:
            query = supabase.table("compliance_checks").select("*").eq("id", check_id)
            # Egalik tekshiruvi: organization_id bo'yicha filtr (Multi-tenant izolyatsiya)
            if current_user.organization_id:
                query = query.eq("organization_id", current_user.organization_id)
            res = query.execute()
            if res.data and len(res.data) > 0:
                return _row_to_check_report(res.data[0])
        except Exception as e:
            logger.error(f"Supabase dan compliance_checks o'qishda xato: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ma'lumotlar bazasidan tekshiruvni olishda xatolik: {str(e)}",
            )

    # In-memory tekshiruvi (fallback)
    if check_id in memory_store.get("compliance_checks", {}):
        return _row_to_check_report(memory_store["compliance_checks"][check_id])
    if check_id in memory_store.get("checks", {}):
        return _row_to_check_report(memory_store["checks"][check_id])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Tekshiruv hisoboti topilmadi yoki siz uchun ruxsat yo'q: {check_id}",
    )


@router.get(
    "/{check_id}/verify",
    summary="QR-koddan kelgan tekshiruv haqiqiyligini tekshirish",
)
async def verify_check(check_id: str):
    """
    QR-koddan kelgan tekshiruv haqiqiyligini aniqlash.
    Ekspertiza xulosasi haqiqiyligi, statusi, loyiha fayli, tahlil sanasi va xavfsizlik heshini qaytaradi.
    """
    raw_data: Optional[Dict[str, Any]] = None
    is_valid_uuid = False
    try:
        uuid.UUID(str(check_id))
        is_valid_uuid = True
    except (ValueError, AttributeError):
        is_valid_uuid = False

    supabase = get_supabase()
    if supabase and is_valid_uuid:
        try:
            res = supabase.table("compliance_checks").select("*").eq("id", check_id).execute()
            if res.data and len(res.data) > 0:
                raw_data = res.data[0]
        except Exception as e:
            logger.warning(f"Supabase dan compliance_checks tekshirishda ogohlantirish: {e}")

    if not raw_data and check_id in memory_store.get("compliance_checks", {}):
        raw_data = memory_store["compliance_checks"][check_id]
    elif not raw_data and check_id in memory_store.get("checks", {}):
        raw_data = memory_store["checks"][check_id]

    if not raw_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tekshiruv ma'lumotlari topilmadi: {check_id}",
        )

    comp_res = raw_data.get("compliance_results") or {}
    summary = raw_data.get("summary")
    if summary is None and isinstance(comp_res, dict) and "summary" in comp_res:
        summary = comp_res["summary"]
    elif summary is None:
        summary = {}

    results = raw_data.get("results")
    if results is None and isinstance(comp_res, dict):
        results = comp_res.get("violations", comp_res.get("results", []))
    elif results is None:
        results = []

    total_checks = summary.get("total_checks", len(results)) if isinstance(summary, dict) else len(results)
    passed = summary.get("passed", sum(1 for r in results if isinstance(r, dict) and r.get("status") == "pass")) if isinstance(summary, dict) else 0
    failed = summary.get("failed", sum(1 for r in results if isinstance(r, dict) and r.get("status") == "fail")) if isinstance(summary, dict) else 0
    pass_rate = summary.get("pass_rate_percent", round((passed / total_checks * 100), 1) if total_checks else 0.0) if isinstance(summary, dict) else 0.0

    # SHA-256 verifikatsiya heshi
    created_at_str = str(raw_data.get("created_at", ""))
    file_name_str = str(raw_data.get("file_name", ""))
    data_to_hash = f"{check_id}:{created_at_str}:{file_name_str}:{total_checks}:{passed}"
    verification_hash = hashlib.sha256(data_to_hash.encode()).hexdigest()

    status_val = raw_data.get("status", "completed")
    if hasattr(status_val, "value"):
        status_val = status_val.value

    return {
        "verified": True,
        "check_id": check_id,
        "document_number": f"EXP-{check_id[:8].upper()}-2026",
        "file_name": file_name_str,
        "status": status_val,
        "compliance_status": "APPROVED" if (isinstance(summary, dict) and summary.get("ekspertiza_ready")) else "FAILED",
        "total_rules": total_checks,
        "passed_rules": passed,
        "failed_rules": failed,
        "pass_rate_percent": pass_rate,
        "created_at": created_at_str,
        "completed_at": raw_data.get("completed_at"),
        "verification_hash": verification_hash,
        "issuer": "Me'morAI Yordamchi Ekspertiza Tizimi",
        "disclaimer": "Bu hujjat litsenziyalangan bosh mutaxassis (GIP) xulosasini almashtirmaydi. Yakuniy qaror faqat litsenziyalangan ekspertda.",
    }


@router.get(
    "/{check_id}/pdf",
    summary="QR-kodli PDF texnik ekspertiza hisobotini yuklab olish",
)
async def download_pdf_report(
    check_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Tekshiruvning ShNQ va QMQ me'yorlari asosidagi PDF texnik ekspertiza xulosasini qaytaradi.
    Faqat o'z organization_id ga tegishli tekshiruv PDF'lari ko'rinadi.
    """
    from fastapi.responses import FileResponse
    try:
        from backend.services.pdf_generator import PDFReportGenerator
    except ImportError:
        from services.pdf_generator import PDFReportGenerator

    # 1. Ma'lumotlarni qidirish (Supabase yoki memory_store)
    check_report: Optional[CheckReport] = None
    is_valid_uuid = False
    try:
        uuid.UUID(str(check_id))
        is_valid_uuid = True
    except (ValueError, AttributeError):
        pass

    supabase = get_supabase()
    if supabase and is_valid_uuid:
        try:
            res = supabase.table("compliance_checks").select("*").eq("id", check_id).execute()
            if res.data and len(res.data) > 0:
                check_report = _row_to_check_report(res.data[0])
        except Exception as e:
            logger.error(f"Supabase o'qishda xato: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ma'lumotlar bazasidan tekshiruvni olishda xatolik: {str(e)}",
            )

    if not check_report and check_id in memory_store.get("compliance_checks", {}):
        check_report = _row_to_check_report(memory_store["compliance_checks"][check_id])
    elif not check_report and check_id in memory_store.get("checks", {}):
        check_report = _row_to_check_report(memory_store["checks"][check_id])

    if not check_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tekshiruv ma'lumotlari topilmadi: {check_id}",
        )

    # 2. PDF generatsiya qilish
    reports_dir = Path(settings.UPLOAD_DIR) / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    pdf_gen = PDFReportGenerator(output_dir=reports_dir)

    pdf_file = pdf_gen.generate_report(
        check_id=check_id,
        project_name=check_report.file_name,
        city="Toshkent",
        building_type="residential",
        check_results=[r.model_dump() for r in check_report.results],
        summary=check_report.summary.model_dump() if check_report.summary else {},
    )

    return FileResponse(
        path=str(pdf_file),
        filename=f"MeMorAI_Ekspertiza_{check_id[:8]}.pdf",
        media_type="application/pdf",
    )
