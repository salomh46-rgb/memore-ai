"""
Me'morAI — Loyihalar Routeri (Projects API)
Bino loyihalarini yaratish, ro'yxatini olish va ID orqali qidirish.
Barcha yo'llar: /api/projects
"""
from datetime import datetime, timezone
import logging
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status

try:
    from backend.database import DatabaseError, get_supabase, memory_store
    from backend.schemas import ProjectCreate, ProjectResponse
    from backend.auth import AuthenticatedUser, get_current_user
except ImportError:
    from database import DatabaseError, get_supabase, memory_store
    from schemas import ProjectCreate, ProjectResponse
    from auth import AuthenticatedUser, get_current_user

router = APIRouter()
logger = logging.getLogger("memore_ai.projects")


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yangi bino loyihasini yaratish",
)
async def create_project(
    payload: ProjectCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ProjectResponse:
    """
    Yangi arxitektura loyihasini ro'yxatdan o'tkazadi.
    Loyiha qat'iy ravishda joriy foydalanuvchining tashkilotiga (organization_id) bog'lanadi.
    """
    project_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loyihani yaratish uchun foydalanuvchining faol organization_id si talab qilinadi.",
        )

    project_data = {
        "id": project_id,
        "organization_id": org_id,
        "name": payload.name,
        "description": payload.description,
        "building_type": payload.building_type,
        "address": payload.address,
        "metadata": payload.metadata or {},
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("projects").insert(project_data).execute()
            if res.data and len(res.data) > 0:
                memory_store["projects"][project_id] = res.data[0]
                return ProjectResponse(**res.data[0])
        except Exception as e:
            logger.error(f"Supabase ga loyiha yozishda xatolik: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ma'lumotlar bazasiga loyihani saqlashda xatolik yuz berdi: {str(e)}",
            )

    # Fallback memory store
    memory_store["projects"][project_id] = project_data
    return ProjectResponse(**project_data)


@router.get(
    "",
    response_model=List[ProjectResponse],
    summary="Faqat o'z tashkilotiga tegishli loyihalar ro'yxatini olish",
)
async def list_projects(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> List[ProjectResponse]:
    """
    Tizimdagi joriy foydalanuvchi tashkilotiga tegishli bino loyihalari ro'yxatini qaytaradi.
    """
    results = []
    seen_ids = set()
    supabase = get_supabase()
    if supabase:
        try:
            query = supabase.table("projects").select("*").order("created_at", desc=True)
            if current_user.organization_id:
                query = query.eq("organization_id", current_user.organization_id)
            res = query.execute()
            if res.data:
                for item in res.data:
                    results.append(ProjectResponse(**item))
                    seen_ids.add(item.get("id"))
        except Exception as e:
            logger.error(f"Supabase dan loyihalarni o'qishda xatolik: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ma'lumotlar bazasidan loyihalarni o'qishda xatolik: {str(e)}",
            )

    # Fallback memory store dagi loyihalarni ham qo'shish (faqat o'z tashkiloti)
    for p in memory_store["projects"].values():
        if p.get("id") not in seen_ids:
            if not current_user.organization_id or p.get("organization_id") == current_user.organization_id:
                results.append(ProjectResponse(**p))
    return results


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Loyiha tafsilotlarini ID orqali olish (tenant tekshiruvi bilan)",
)
async def get_project(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ProjectResponse:
    """
    Berilgan ID bo'yicha loyihani topadi — faqat foydalanuvchi tashkilotiga tegishli bo'lsa.
    """
    is_valid_uuid = False
    try:
        uuid.UUID(str(project_id))
        is_valid_uuid = True
    except (ValueError, AttributeError):
        pass

    supabase = get_supabase()
    if supabase and is_valid_uuid:
        try:
            query = supabase.table("projects").select("*").eq("id", project_id)
            if current_user.organization_id:
                query = query.eq("organization_id", current_user.organization_id)
            res = query.execute()
            if res.data and len(res.data) > 0:
                return ProjectResponse(**res.data[0])
        except Exception as e:
            logger.error(f"Supabase dan loyiha qidirishda xato: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ma'lumotlar bazasidan loyihani qidirishda xatolik: {str(e)}",
            )

    # Fallback memory store
    if project_id in memory_store["projects"]:
        p = memory_store["projects"][project_id]
        if not current_user.organization_id or p.get("organization_id") == current_user.organization_id:
            return ProjectResponse(**p)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Loyiha topilmadi yoki unga ruxsat mavjud emas: {project_id}",
    )
