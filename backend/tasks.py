"""
Me'morAI — Asinxron Vazifalar Moduli (Celery Tasks)
Chizmalarni fon rejimida qayta ishlash, AI Vision extraction va QMQ qoidalari bo'yicha tekshirish.
Graceful Fallback: Agar Celery/Redis o'rnatilmagan bo'lsa ham modul sinmaydi.
"""
from datetime import datetime, timezone
import logging
from pathlib import Path
import sys
from typing import Any, Dict, Optional

# Loyiha ildizini sys.path ga qo'shish (rules modulini topish uchun)
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

try:
    from backend.config import get_settings
    from backend.database import get_supabase, memory_store
except ImportError:
    from config import get_settings
    from database import get_supabase, memory_store

# Rules engine import
try:
    from rules.rules_engine import QMQRulesEngine
except ImportError:
    QMQRulesEngine = None

# Services import
try:
    from backend.services.vision_analyzer import GeminiVisionAnalyzer
    from backend.services.pdf_generator import PDFReportGenerator
    from backend.services.dxf_parser import DXFBlueprintParser
except ImportError:
    from services.vision_analyzer import GeminiVisionAnalyzer
    from services.pdf_generator import PDFReportGenerator
    from services.dxf_parser import DXFBlueprintParser

logger = logging.getLogger("memore_ai.tasks")
settings = get_settings()

# Celery import va sozlash (Graceful Fallback)
try:
    from celery import Celery

    celery_app = Celery(
        "memore_ai",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="Asia/Tashkent",
        enable_utc=True,
        task_track_started=True,
    )
except ImportError:
    logger.warning("celery paketi o'rnatilmagan. Fallback task rejimiga o'tilmoqda.")
    celery_app = None


def _safe_async_run(coro):
    """Celery worker thread ichida event-loop xatolarisiz asinxron korutinani xavfsiz bajarish."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(lambda: asyncio.run(coro))
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def execute_process_drawing(
    check_id: str,
    file_path: str,
    building_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Chizmani tekshirishning asosiy mantiqiy funksiyasi.
    1. Gemini Vision orqali chizmani multimodal skanerlash (agar parametrlar to'liq bo'lmasa)
    2. QMQRulesEngine orqali barcha 50+ me'yorlarni tekshirish
    3. QR-kodli va muhrli PDF texnik ekspertiza hisoboti generatsiya qilish
    """
    logger.info(f"Tekshiruv boshlandi [check_id={check_id}, file={file_path}]")
    completed_at = datetime.now(timezone.utc).isoformat()

    try:
        import asyncio

        # 1. BLUEPRINT EXTRACTION (CAD DXF vs MULTIMODAL VISION)
        ext = Path(file_path).suffix.lower()
        extracted_params: Dict[str, Any] = {}
        extraction_source = "unknown"
        raw_vision_metadata: Dict[str, Any] = {}
        extraction_failed = False

        if ext in (".dxf", ".dwg"):
            extraction_source = "cad_dxf"
            try:
                cad_parser = DXFBlueprintParser()
                cad_result = cad_parser.parse_dxf_file(file_path)
                if cad_result.is_valid and cad_result.extracted_parameters:
                    logger.info(f"CAD DXF dan parametrlar olindi: {list(cad_result.extracted_parameters.keys())}")
                    extracted_params = dict(cad_result.extracted_parameters)
                else:
                    if cad_result.error_message:
                        logger.warning(f"CAD tahlilida eslatma: {cad_result.error_message}")
                    extraction_failed = True
            except Exception as cad_err:
                logger.warning(f"DXF parserda xatolik: {cad_err}")
                extraction_failed = True
        else:
            try:
                vision_analyzer = GeminiVisionAnalyzer(api_key=settings.GEMINI_API_KEY)
                raw_vision_data = _safe_async_run(vision_analyzer.analyze_drawing_file(file_path))
                if isinstance(raw_vision_data, dict):
                    extraction_source = raw_vision_data.get("extraction_source", "gemini_vision")
                    raw_vision_metadata = {
                        k: v for k, v in raw_vision_data.items()
                        if k in ("confidence_score", "notes", "detected_rooms")
                    }
                    if extraction_source == "extraction_failed":
                        extraction_failed = True
                        extracted_params = {}
                    else:
                        extracted_params = {
                            k: v for k, v in raw_vision_data.items()
                            if k not in ("extraction_source", "confidence_score", "notes", "detected_rooms")
                        }
                else:
                    extraction_source = "extraction_failed"
                    extraction_failed = True
                    extracted_params = {}
                logger.info(f"Gemini Vision tahlili (source={extraction_source}): {list(extracted_params.keys())}")
            except Exception as v_err:
                logger.warning(f"Vision ekstraktorida ogohlantirish: {v_err}")
                extraction_source = "extraction_failed"
                extraction_failed = True
                extracted_params = {}

        # P0-2 FIX: Qiymat manbasi belgisi (Value source tagging & conflict detection)
        values_with_source: Dict[str, Dict[str, Any]] = {}
        for k, v in extracted_params.items():
            values_with_source[k] = {"value": v, "source": "extracted"}
        for k, v in (building_data or {}).items():
            if k in values_with_source:
                # Nomuvofiqlik: ikkala manba bir-biridan farq qilsa
                values_with_source[k]["user_declared"] = v
                values_with_source[k]["conflict"] = True
            else:
                values_with_source[k] = {"value": v, "source": "user_declared"}

        # Dvigatelga faqat qiymatlarni bering (manba metadata alohida saqlanadi)
        data = {k: v["value"] for k, v in values_with_source.items()}

        has_conflicts = any(v.get("conflict", False) for v in values_with_source.values())
        vision_source_metadata = {
            "extraction_source": extraction_source,
            "extraction_failed": extraction_failed,
            "has_conflicts": has_conflicts,
            "values_with_source": values_with_source,
            **raw_vision_metadata,
        }

        # Vision xatosida ExtractionFailed exception o'rniga check holatini "requires_review" ga o'tkazish
        final_status = "requires_review" if extraction_failed else "completed"

        # 2. QMQRULESENGINE TEKSHIRUVI (50+ ta ShNQ / QMQ me'yorlari)
        engine = QMQRulesEngine() if QMQRulesEngine else None
        results_list = []
        summary_data = {
            "total_checks": 0,
            "passed": 0,
            "failed": 0,
            "critical_failures": 0,
            "pass_rate_percent": 0.0,
            "ekspertiza_ready": False,
        }

        if engine:
            raw_results = engine.run_all_checks(data)
            results_list = [
                {
                    "rule_id": r.rule_id,
                    "code": r.code,
                    "clause": r.clause,
                    "category": r.category,
                    "severity": r.severity.value,
                    "status": r.status.value,
                    "title_uz": r.title_uz,
                    "title_ru": r.title_ru,
                    "actual_value": r.actual_value,
                    "required_value": r.required_value,
                    "message_uz": r.message_uz,
                    "message_ru": r.message_ru,
                    "confidence": r.confidence,
                    "evidence_bbox": r.evidence_bbox,
                    "source_page": r.source_page,
                    "notes": r.notes,
                }
                for r in raw_results
            ]
            summary_data = engine.summary(raw_results)

        # 3. TEXNIK EKSPERTIZA PDF HISOBOT GENERATSIYASI (QR-kodli)
        pdf_path_str = None
        pdf_url_str = None
        try:
            reports_dir = Path(settings.UPLOAD_DIR) / "reports"
            reports_dir.mkdir(parents=True, exist_ok=True)
            pdf_gen = PDFReportGenerator(output_dir=reports_dir)
            pdf_file = pdf_gen.generate_report(
                check_id=check_id,
                project_name=data.get("project_title", f"Loyiha chizmasi: {Path(file_path).name}"),
                city=data.get("city", "Toshkent"),
                building_type=data.get("building_type", "residential"),
                check_results=results_list,
                summary=summary_data,
                source_metadata=vision_source_metadata,
            )
            pdf_path_str = str(pdf_file)
            pdf_url_str = f"/api/checks/{check_id}/pdf"
            logger.info(f"✅ Texnik PDF Ekspertiza hisoboti yaratildi: {pdf_path_str}")
        except Exception as pdf_err:
            logger.error(f"PDF hisobot generatsiyasida xato: {pdf_err}")

        update_payload = {
            "status": final_status,
            "results": results_list,
            "summary": summary_data,
            "pdf_report_path": pdf_path_str,
            "pdf_report_url": pdf_url_str,
            "vision_source_metadata": vision_source_metadata,
            "completed_at": completed_at,
            "error_message": "Chizmadan o'lchamlar avtomatik ajratilmadi. Mutaxassis ko'rigi talab etiladi." if extraction_failed else None,
        }

        supabase = get_supabase()
        if supabase:
            try:
                comp_payload = {
                    "status": final_status,
                    "total_rules": summary_data.get("total_checks", len(results_list)),
                    "passed_count": summary_data.get("passed", 0),
                    "failed_count": summary_data.get("failed", 0),
                    "warning_count": 0,
                    "compliance_score": summary_data.get("pass_rate_percent", 0.0),
                    "compliance_results": {
                        "version": "1.0.0",
                        "rules_engine": "QMQRulesEngine",
                        "violations": results_list,
                        "summary": summary_data,
                        "pdf_report_path": pdf_path_str,
                        "pdf_report_url": pdf_url_str,
                        "vision_source_metadata": vision_source_metadata,
                        "error_message": update_payload.get("error_message"),
                    },
                    "summary_uz": f"Tekshiruv yakunlandi: {summary_data.get('passed', 0)} ta qoida muvofiq, {summary_data.get('failed', 0)} ta qoidabuzarlik.",
                    "completed_at": completed_at,
                }
                supabase.table("compliance_checks").update(comp_payload).eq("id", check_id).execute()
            except Exception as db_err:
                logger.error(f"Supabase compliance_checks yangilashda xato: {db_err}")

        if check_id in memory_store.get("compliance_checks", {}):
            memory_store["compliance_checks"][check_id].update(update_payload)
        else:
            memory_store.setdefault("compliance_checks", {})[check_id] = {
                "id": check_id,
                "file_path": file_path,
                **update_payload,
            }

        if check_id in memory_store.get("checks", {}):
            memory_store["checks"][check_id].update(update_payload)
        else:
            memory_store.setdefault("checks", {})[check_id] = {
                "id": check_id,
                "file_path": file_path,
                **update_payload,
            }

        logger.info(f"Tekshiruv muvaffaqiyatli yakunlandi [check_id={check_id}, status={final_status}]")
        return {
            "check_id": check_id,
            "status": final_status,
            "summary": summary_data,
            "results_count": len(results_list),
            "vision_source_metadata": vision_source_metadata,
        }

    except Exception as exc:
        logger.exception(f"Tekshiruvda xatolik yuz berdi [check_id={check_id}]: {exc}")
        error_payload = {
            "status": "failed",
            "error_message": str(exc),
            "completed_at": completed_at,
        }
        supabase = get_supabase()
        if supabase:
            try:
                err_db_payload = {
                    "status": "failed",
                    "compliance_results": {"error_message": str(exc)},
                    "summary_uz": f"Tekshiruvda xatolik yuz berdi: {str(exc)}",
                    "completed_at": completed_at,
                }
                supabase.table("compliance_checks").update(err_db_payload).eq("id", check_id).execute()
            except Exception as db_err:
                logger.error(f"Supabase xatolik holatini yozishda xato: {db_err}")

        if check_id in memory_store.get("compliance_checks", {}):
            memory_store["compliance_checks"][check_id].update(error_payload)
        if check_id in memory_store.get("checks", {}):
            memory_store["checks"][check_id].update(error_payload)

        raise exc


# Celery task yoki Proxy obyekti
if celery_app:
    @celery_app.task(name="process_drawing", bind=True)
    def process_drawing(
        self,
        check_id: str,
        file_path: str,
        building_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return execute_process_drawing(check_id, file_path, building_data)
else:
    class MockCeleryTask:
        """Celery o'rnatilmagan muhitlar uchun shaffof proxy task obyekti."""
        def __call__(self, *args: Any, **kwargs: Any) -> Dict[str, Any]:
            if len(args) == 4 and args[0] is None:
                _, c_id, f_path, b_data = args
                return execute_process_drawing(c_id, f_path, b_data)
            elif len(args) == 3:
                c_id, f_path, b_data = args
                return execute_process_drawing(c_id, f_path, b_data)
            elif len(args) == 2:
                c_id, f_path = args
                return execute_process_drawing(c_id, f_path, None)
            return execute_process_drawing(*args, **kwargs)

        def delay(
            self,
            check_id: str,
            file_path: str,
            building_data: Optional[Dict[str, Any]] = None,
        ) -> Dict[str, Any]:
            return execute_process_drawing(check_id, file_path, building_data)

    process_drawing = MockCeleryTask()  # type: ignore
