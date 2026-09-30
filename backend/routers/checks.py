"""
Me'morAI — Tekshiruvlar Routeri (Checks API)
Chizmalarni yuklash, tahlil qilish va QMQ qoidalari bo'yicha hisobotlarni olish.
Barcha yo'llar: /api/checks
"""
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Optional
import uuid
import aiofiles
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status

try:
    from backend.config import get_settings
    from backend.database import get_supabase, memory_store
    from backend.schemas import CheckJobStatus, CheckReport
    from backend.tasks import celery_app, execute_process_drawing, process_drawing
except ImportError:
    from config import get_settings
    from database import get_supabase, memory_store
    from schemas import CheckJobStatus, CheckReport
    from tasks import celery_app, execute_process_drawing, process_drawing

router = APIRouter()
logger = logging.getLogger("memore_ai.checks")
settings = get_settings()


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
) -> CheckReport:
    """
    Chizmani qabul qiladi, diskka saqlaydi va asinxron tahlil jarayonini boshlaydi.
    Celery mavjud bo'lsa Celery orqali, aks holda fon vazifasi (BackgroundTasks) orqali bajaradi.
    """
    check_id = f"chk_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Yuklash katalogini tayyorlash
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_file_name = f"{check_id}_{file.filename or 'drawing'}"
    file_path = upload_dir / safe_file_name

    # 2. Faylni diskka asinxron yozish
    try:
        async with aiofiles.open(file_path, "wb") as buffer:
            while content := await file.read(1024 * 1024):
                await buffer.write(content)
    except Exception as e:
        logger.error(f"Faylni saqlashda xato: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Faylni yuklashda xatolik yuz berdi: {str(e)}",
        )

    # 3. JSON building_data ni tahlil qilish
    parsed_building_data = {}
    if building_data:
        try:
            parsed_building_data = json.loads(building_data)
        except json.JSONDecodeError:
            logger.warning("building_data noto'g'ri JSON formatida yuborildi.")

    # 4. Check dastlabki holatini saqlash
    initial_check_data = {
        "id": check_id,
        "project_id": project_id,
        "file_name": file.filename or "drawing",
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
            supabase.table("checks").insert(initial_check_data).execute()
        except Exception as e:
            logger.error(f"Supabase ga tekshiruv yozishda xato: {e}")

    memory_store["checks"][check_id] = initial_check_data

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
async def get_check_result(check_id: str) -> CheckReport:
    """
    Check ID orqali tahlil holati, qoidalar bo'yicha natijalar va xulosani qaytaradi.
    Topilmasa 404 xatolik beradi.
    """
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("checks").select("*").eq("id", check_id).execute()
            if res.data and len(res.data) > 0:
                return CheckReport(**res.data[0])
        except Exception as e:
            logger.error(f"Supabase dan tekshiruvni o'qishda xato: {e}")

    if check_id in memory_store["checks"]:
        return CheckReport(**memory_store["checks"][check_id])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Tekshiruv hisoboti topilmadi: {check_id}",
    )
