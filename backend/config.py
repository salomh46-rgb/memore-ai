"""
Me'morAI — Backend Konfiguratsiya Moduli
Pydantic v2 Settings orqali barcha muhit o'zgaruvchilarini boshqaradi.
Zero-Secret-Leakage: Maxfiy kalitlar faqat .env orqali yuklanadi.
"""
from functools import lru_cache
import json
import logging
from typing import List, Optional, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("memore_ai.config")


class Settings(BaseSettings):
    """Loyiha sozlamalari va muhit o'zgaruvchilari."""

    # 1. Asosiy ilova sozlamalari
    APP_NAME: str = "MemoreAI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_PORT: int = 8000
    REDIS_PORT: int = 6379
    TIMEZONE: str = "Asia/Tashkent"

    # 2. Xavfsizlik va JWT
    SECRET_KEY: str = "memore-ai-default-insecure-secret-key-change-in-prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # 3. Supabase va PostgreSQL sozlamalari
    DATABASE_URL: Optional[str] = None
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # 4. Redis va Celery sozlamalari
    REDIS_HOST: Optional[str] = None
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None
    UPSTASH_REDIS_REST_URL: Optional[str] = None
    UPSTASH_REDIS_REST_TOKEN: Optional[str] = None

    # 5. Multimodal AI provayderlari
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # 6. Telegram Bot va WebApp
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_ADMIN_IDS: Optional[str] = None
    TELEGRAM_WEBAPP_URL: Optional[str] = None

    # 7. Fayllar saqlash katalogi va cheklovlar
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: Optional[str] = "pdf,dwg,dxf,png,jpg,jpeg"

    # 8. CORS va Tashqi manzillar
    BASE_URL: str = "https://memore.62.171.143.55.sslip.io"
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="forbid",
    )

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Union[List[str], str]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(o).strip() for o in parsed if str(o).strip()]
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @model_validator(mode="after")
    def validate_and_sync_keys(self) -> "Settings":
        # SUPABASE_KEY to'ldirilmagan bo'lsa, mavjud SERVICE_ROLE yoki ANON kalitdan olinsin
        if not self.SUPABASE_KEY:
            if self.SUPABASE_SERVICE_ROLE_KEY:
                self.SUPABASE_KEY = self.SUPABASE_SERVICE_ROLE_KEY
            elif self.SUPABASE_ANON_KEY:
                self.SUPABASE_KEY = self.SUPABASE_ANON_KEY

        # Production muhit tekshiruvi: xavfsiz SECRET_KEY va zarur kalitlar mavjudligi
        if self.ENVIRONMENT == "production":
            insecure_markers = [
                "default-insecure",
                "change-in-prod",
                "replace_with",
            ]
            if not self.SECRET_KEY or any(m in self.SECRET_KEY.lower() for m in insecure_markers) or len(self.SECRET_KEY) < 16:
                raise ValueError(
                    "Production muhitida SECRET_KEY xavfsiz qiymatga ega bo'lishi shart! "
                    "Boshlang'ich ('default-insecure') kalitdan foydalanish qat'iyan man etiladi."
                )
            if not self.SUPABASE_URL or not self.SUPABASE_KEY:
                raise ValueError(
                    "Production muhitida SUPABASE_URL va SUPABASE_KEY o'rnatilishi shart!"
                )

        return self


@lru_cache
def get_settings() -> Settings:
    """Sozlamalar nusxasini keshlab qaytaradi."""
    return Settings()
