"""
Me'morAI — Supabase Auth Dependency (P0-1: Authentication & Authorization)
FastAPI dependency orqali barcha endpoint larda JWT token tekshiruvi.
Supabase Auth bilan integratsiya — har bir so'rovda foydalanuvchi aniqlanadi.
"""
from typing import Optional
import logging
from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger("memore_ai.auth")
bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Autentifikatsiyadan o'tgan foydalanuvchi konteksti."""

    def __init__(
        self,
        user_id: str,
        email: str,
        organization_id: Optional[str] = None,
        role: str = "architect",
    ):
        self.user_id = user_id
        self.email = email
        self.organization_id = organization_id
        self.role = role


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency: Supabase JWT tokenini tekshiradi.
    Barcha himoyalangan endpointlarda Depends(get_current_user) qo'llanilishi kerak.

    Token mavjud bo'lmasa yoki yaroqsiz bo'lsa — 401 Unauthorized.
    """
    try:
        from backend.config import get_settings
        from backend.database import get_supabase
    except ImportError:
        from config import get_settings
        from database import get_supabase

    settings = get_settings()

    # DEVELOPMENT muhitda: Token bo'lmasa demo foydalanuvchi qaytaradi
    # PRODUCTION muhitda: Token majburiy
    if not credentials or not credentials.credentials:
        if settings.ENVIRONMENT == "development":
            logger.warning("⚠️ DEV rejimida autentifikatsiyasiz so'rov qabul qilindi.")
            return AuthenticatedUser(
                user_id="dev-user-001",
                email="dev@memore-ai.uz",
                organization_id="dev-org-001",
                role="admin",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentifikatsiya talab qilinadi. Authorization: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Supabase Auth orqali JWT tekshiruvi
    supabase = get_supabase()
    if supabase:
        try:
            user_response = supabase.auth.get_user(token)
            if not user_response or not user_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token yaroqsiz yoki muddati o'tgan.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            user = user_response.user
            user_id = str(user.id)
            email = user.email or ""

            # 1. Server boshqaruvidagi app_metadata dan tekshirish (client o'zgartira olmaydi)
            app_meta = getattr(user, "app_metadata", {}) or {}
            org_id = app_meta.get("organization_id")
            role = app_meta.get("role")

            # 2. Agar app_metadata da bo'lmasa, authoritative DB (public.users) dan o'qish
            if not org_id or not role:
                try:
                    db_user = supabase.table("users").select("organization_id, role").eq("id", user_id).limit(1).execute()
                    if db_user.data and len(db_user.data) > 0:
                        row = db_user.data[0]
                        org_id = org_id or row.get("organization_id")
                        role = role or row.get("role")
                except Exception as db_err:
                    logger.warning(f"Auth DB tekshiruvida ogohlantirish: {db_err}")

            # 3. Development muhitida qulay fallback, Production da qat'iy tekshiruv
            if not org_id:
                if settings.ENVIRONMENT == "development":
                    org_id = "dev-org-001"
                else:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Foydalanuvchi biror faol tashkilotga a'zo emas.",
                    )

            if not role:
                role = "architect"

            return AuthenticatedUser(
                user_id=user_id,
                email=email,
                organization_id=org_id,
                role=role,
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token tekshiruvida xatolik: {type(e).__name__}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tekshiruvida xatolik.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # Supabase ulanmagan — development fallback
        if settings.ENVIRONMENT != "development":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Auth xizmati mavjud emas.",
            )
        return AuthenticatedUser(
            user_id="local-user-001",
            email="local@memore-ai.uz",
            organization_id="local-org-001",
            role="admin",
        )


def require_role(*allowed_roles: str):
    """
    Rol asosida ruxsat beruvchi dependency factory.
    Misol: Depends(require_role('admin', 'expert'))
    """
    async def role_checker(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu amal uchun ruxsat yo'q. Kerakli rol: {allowed_roles}",
            )
        return user
    return role_checker
