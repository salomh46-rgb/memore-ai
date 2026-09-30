"""
Matnlar (i18n) paketi
"""
from typing import Any
from . import uz, ru

def get_texts(lang: str = "uz"):
    """Foydalanuvchi tiliga mos matnlar modulini qaytaradi."""
    if lang == "ru":
        return ru
    return uz

__all__ = ["uz", "ru", "get_texts"]
