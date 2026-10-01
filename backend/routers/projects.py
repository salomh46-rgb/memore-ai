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
async def create_project(payload: ProjectCreate) -> ProjectResponse:
    """
    Yangi arxitektura loyihasini ro'yxatdan o'tkazadi.
    Standart UUID formatidagi ID bilan saqlanadi.
    Supabase 'projects' jadvaliga saqlaydi (yoki xotiraga fallback).
    """
    project_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    supabase = get_supabase()
    org_id = None
    if supabase:
        try:
            org_res = supabase.table("organizations").select("id").limit(1).execute()
            if org_res.data and len(org_res.data) > 0:
                org_id = org_res.data[0]["id"]
        except Exception as org_err:
            logger.warning(f"Tashkilot ID sini aniqlashda ogohlantirish: {org_err}")

    if not org_id:
        org_id = "a0000000-0000-0000-0000-000000000001"

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
    summary="Barcha loyihalar ro'yxatini olish",
)
async def list_projects() -> List[ProjectResponse]:
    """
    Tizimdagi barcha bino loyihalari ro'yxatini qaytaradi.
    """
    results = []
    seen_ids = set()
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("projects").select("*").order("created_at", desc=True).execute()
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

    # Fallback memory store dagi loyihalarni ham qo'shish
    for p in memory_store["projects"].values():
        if p.get("id") not in seen_ids:
            results.append(ProjectResponse(**p))
    return results


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Loyiha tafsilotlarini ID orqali olish",
)
async def get_project(project_id: str) -> ProjectResponse:
    """
    Berilgan ID bo'yicha loyihani topadi va qaytaradi.
    Topilmasa 404 xatolik qaytaradi.
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
            res = supabase.table("projects").select("*").eq("id", project_id).execute()
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
        return ProjectResponse(**memory_store["projects"][project_id])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Loyiha topilmadi: {project_id}",
    )
