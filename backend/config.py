"""
Me'morAI — Backend Konfiguratsiya Moduli
Pydantic v2 Settings orqali barcha muhit o'zgaruvchilarini boshqaradi.
Zero-Secret-Leakage: Maxfiy kalitlar faqat .env orqali yuklanadi.
"""
from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Loyiha sozlamalari va muhit o'zgaruvchilari."""

    # Supabase sozlamalari
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # Gemini AI kaliti (Vision va extraction uchun)
    GEMINI_API_KEY: str = ""

    # Xavfsizlik va JWT
    SECRET_KEY: str = "memore-ai-default-insecure-secret-key-change-in-prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # CORS sozlamalari
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Celery va Redis sozlamalari
    REDIS_URL: str = "redis://localhost:6379/0"

    # Fayllar saqlash katalogi
    UPLOAD_DIR: str = "uploads"

    # Muhit: development | staging | production
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Union[List[str], str]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    """Sozlamalar nusxasini keshlab qaytaradi."""
    return Settings()
