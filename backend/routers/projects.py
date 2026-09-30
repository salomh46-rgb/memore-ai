"""
Me'morAI — Loyihalar Routeri (Projects API)
Bino loyihalarini yaratish, ro'yxatini olish va ID orqali qidirish.
Barcha yo'llar: /api/projects
"""
from datetime import datetime, timezone
import logging
from typing import List
import uuid
from fastapi import APIRouter, HTTPException, status

try:
    from backend.database import get_supabase, memory_store
    from backend.schemas import ProjectCreate, ProjectResponse
except ImportError:
    from database import get_supabase, memory_store
    from schemas import ProjectCreate, ProjectResponse

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
    Supabase 'projects' jadvaliga saqlaydi (yoki xotiraga fallback).
    """
    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    project_data = {
        "id": project_id,
        "name": payload.name,
        "description": payload.description,
        "building_type": payload.building_type,
        "address": payload.address,
        "metadata": payload.metadata,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("projects").insert(project_data).execute()
            if res.data and len(res.data) > 0:
                return ProjectResponse(**res.data[0])
        except Exception as e:
            logger.error(f"Supabase ga yozishda xatolik: {e}")

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
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("projects").select("*").order("created_at", desc=True).execute()
            if res.data:
                return [ProjectResponse(**item) for item in res.data]
        except Exception as e:
            logger.error(f"Supabase dan o'qishda xatolik: {e}")

    # Fallback memory store
    return [ProjectResponse(**p) for p in memory_store["projects"].values()]


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
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("projects").select("*").eq("id", project_id).execute()
            if res.data and len(res.data) > 0:
                return ProjectResponse(**res.data[0])
        except Exception as e:
            logger.error(f"Supabase dan loyiha qidirishda xato: {e}")

    # Fallback memory store
    if project_id in memory_store["projects"]:
        return ProjectResponse(**memory_store["projects"][project_id])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Loyiha topilmadi: {project_id}",
    )
