"""
Me'morAI — Database & Supabase Klienti
Supabase bilan xavfsiz ulanishni ta'minlaydi.
Zero-Secret-Leakage: Kalitlar faqat sozlamalardan olinadi.
Graceful Fallback: Agar supabase-py o'rnatilmagan bo'lsa yoki ulanish sozlanmagan bo'lsa,
tizim qulab tushmaydi, balki in-memory vaqtinchalik ombor bilan ishlaydi.
"""
import logging
from typing import Any, Optional

try:
    from backend.config import get_settings
except ImportError:
    from config import get_settings

logger = logging.getLogger("memore_ai.database")

# Supabase kutubxonasini xavfsiz import qilish
try:
    from supabase import create_client, Client
except (ImportError, AttributeError):
    create_client = None
    Client = Any  # type: ignore

_supabase_client: Optional[Client] = None


def get_supabase() -> Optional[Client]:
    """
    Supabase klientining yagona nusxasini (singleton) qaytaradi.
    Agar URL va Kalit kiritilmagan bo'lsa yoki kutubxona bo'lmasa, None qaytaradi.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if create_client is None:
        logger.warning(
            "supabase-py kutubxonasi mavjud emas. "
            "Backend in-memory vaqtinchalik ombor rejimida ishlaydi."
        )
        return None

    settings = get_settings()

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning(
            "SUPABASE_URL yoki SUPABASE_KEY o'rnatilmagan. "
            "Backend in-memory vaqtinchalik ombor rejimida ishlaydi."
        )
        return None

    try:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase mijoziga muvaffaqiyatli ulandi.")
        return _supabase_client
    except Exception as e:
        logger.error(f"Supabase mijozini yaratishda xatolik: {e}")
        return None


# Ishlab chiqish payti uchun xotirada saqlanuvchi vaqtinchalik ombor (In-memory fallback)
memory_store: dict[str, dict[str, Any]] = {
    "projects": {},
    "checks": {},
}
