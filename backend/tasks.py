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


def execute_process_drawing(
    check_id: str,
    file_path: str,
    building_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Chizmani tekshirishning asosiy mantiqiy funksiyasi.
    QMQRulesEngine orqali barcha qoidalarni tekshiradi va natijalarni saqlaydi.
    """
    logger.info(f"Tekshiruv boshlandi [check_id={check_id}, file={file_path}]")
    completed_at = datetime.now(timezone.utc).isoformat()

    try:
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

        if engine and building_data:
            # QMQRulesEngine.run_all_checks orqali tekshirish
            raw_results = engine.run_all_checks(building_data)
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
        elif not building_data:
            logger.info("Bino parametrlari (building_data) kiritilmagan, dastlabki tekshiruv.")

        update_payload = {
            "status": "completed",
            "results": results_list,
            "summary": summary_data,
            "completed_at": completed_at,
            "error_message": None,
        }

        supabase = get_supabase()
        if supabase:
            try:
                supabase.table("checks").update(update_payload).eq("id", check_id).execute()
            except Exception as db_err:
                logger.error(f"Supabase yangilashda xato: {db_err}")

        if check_id in memory_store["checks"]:
            memory_store["checks"][check_id].update(update_payload)
        else:
            memory_store["checks"][check_id] = {
                "id": check_id,
                "file_path": file_path,
                **update_payload,
            }

        logger.info(f"Tekshiruv muvaffaqiyatli yakunlandi [check_id={check_id}]")
        return {
            "check_id": check_id,
            "status": "completed",
            "summary": summary_data,
            "results_count": len(results_list),
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
                supabase.table("checks").update(error_payload).eq("id", check_id).execute()
            except Exception:
                pass

        if check_id in memory_store["checks"]:
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
