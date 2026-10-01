"""
Me'morAI — FastAPI Asosiy Dastur Moduli (Main App)
Bino loyihalari va chizmalarini O'zbekiston QMQ/ShNQ me'yorlariga mosligini tekshirish tizimi.
"""
from contextlib import asynccontextmanager
import logging
from pathlib import Path
import sys
from typing import AsyncGenerator

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Loyiha ildiz katalogini va backend papkasini sys.path ga kiritish
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent

for p in [str(project_root), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.config import get_settings
    from backend.database import DatabaseError, get_supabase
    from backend.routers import checks_router, projects_router
except (ImportError, ModuleNotFoundError):
    from config import get_settings
    from database import DatabaseError, get_supabase
    from routers import checks_router, projects_router

# Logging sozlamalari
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("memore_ai.main")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Ilovaning hayot sikli (Lifespan context manager).
    Ishga tushish va to'xtatilish paytidagi amallarni boshqaradi.
    """
    logger.info("🚀 Me'morAI Backend ishga tushmoqda...")
    logger.info(f"Muhit: {settings.ENVIRONMENT} | Debug: {settings.DEBUG}")

    # Fayl saqlash katalogini tayyorlash
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    logger.info(f"Fayllar katalogi tayyor: {upload_path.resolve()}")

    # Supabase ulanishini tekshirish
    supabase_client = get_supabase()
    if supabase_client:
        logger.info("✅ Supabase bazasiga ulanish mavjud.")
    else:
        logger.warning("⚠️ Supabase ulanmadi, in-memory vaqtinchalik rejim faol.")

    yield

    logger.info("🛑 Me'morAI Backend to'xtatilmoqda...")


# FastAPI ilovasini yaratish
app = FastAPI(
    title="Me'morAI — ShNQ/QMQ Arxitektura Auditi API",
    description=(
        "O'zbekiston QMQ/ShNQ shaharsozlik me'yorlari asosida "
        "arxitektura chizmalarini avtomatlashtirilgan ekspertizasi va tahlili."
    ),
    version="1.0.0",
    lifespan=lifespan,
    # Production da docs o'chiriladi (xavfsizlik)
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/api/openapi.json" if settings.ENVIRONMENT != "production" else None,
)

# CORS sozlamalari — production da faqat aniq domenlar
allowed_origins = (
    settings.ALLOWED_ORIGINS
    if isinstance(settings.ALLOWED_ORIGINS, list)
    else [settings.ALLOWED_ORIGINS]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# Xatoliklar boshqaruvi (5xx qaytarish)
@app.exception_handler(DatabaseError)
async def database_error_handler(request, exc: DatabaseError):
    logger.error(f"Kritik ma'lumotlar bazasi xatoligi: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Ma'lumotlar bazasi xatoligi yuz berdi: {str(exc)}"},
    )

# API Routerlarini ulash
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(checks_router, prefix="/api/checks", tags=["Checks"])


@app.get(
    "/verify/{check_id}",
    include_in_schema=False,
)
async def verify_redirect(check_id: str):
    """QR-koddan kelgan so'rovni /api/checks/{check_id}/verify ga yo'naltirish."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/api/checks/{check_id}/verify")


# Health Check endpoint
@app.get(
    "/api/health",
    status_code=status.HTTP_200_OK,
    summary="Backend salomatlik holati (Health Check)",
    tags=["Health"],
)
async def health_check() -> JSONResponse:
    """
    Tizimning hozirgi holati, muhit va xizmatlar statusini qaytaradi.
    """
    supabase_connected = get_supabase() is not None
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "healthy",
            "app_name": "Me'morAI Backend",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "services": {
                "supabase": "connected" if supabase_connected else "fallback_in_memory",
                "rules_engine": "ready",
            },
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
