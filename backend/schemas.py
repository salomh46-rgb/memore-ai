"""
Me'morAI — Pydantic v2 Ma'lumot Modellari (Schemas)
Loyiha va tekshiruvlar (Checks) uchun qat'iy tipizatsiya qilingan modellar.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class CheckStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    REQUIRES_REVIEW = "requires_review"


class CheckJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_REVIEW = "requires_review"


# ─────────────────────────────────────────
# 1. LOYIHA (PROJECT) MODELLARI
# ─────────────────────────────────────────

class ProjectCreate(BaseModel):
    """Yangi bino loyihasini yaratish so'rovi."""
    name: str = Field(..., min_length=2, max_length=255, description="Loyiha nomi")
    description: Optional[str] = Field(None, max_length=1000, description="Tavsifi")
    building_type: str = Field(default="residential", description="Bino turi (masalan, residential, public)")
    address: Optional[str] = Field(None, max_length=500, description="Bino manzili")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Qo'shimcha parametrlar")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Yunusobod Turar-joy Majmuasi (A Blok)",
                "description": "9 qavatli ko'p xonadonli turar-joy binosi",
                "building_type": "residential",
                "address": "Toshkent sh., Yunusobod tumani, 4-mavze",
                "metadata": {
                    "floors": 9,
                    "construction_type": "new"
                }
            }
        }
    )


class ProjectResponse(BaseModel):
    """Loyiha tafsilotlari javobi."""
    id: str
    name: str
    description: Optional[str] = None
    building_type: str
    address: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────
# 2. TEKSHIRUV (CHECK) MODELLARI
# ─────────────────────────────────────────

class CheckRequest(BaseModel):
    """Chizma tekshiruvini boshlash so'rovi (JSON formatda parametrlar)."""
    project_id: str = Field(..., description="Tegishli loyiha ID raqami")
    building_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Bino parametrlari (shift balandligi, xonadonlar, pandus va h.k.)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_id": "proj_123456",
                "building_data": {
                    "construction_type": "new",
                    "ceiling_height_m": 2.8,
                    "apartments": 48,
                    "parking_spots": 50,
                    "ramp_rise_m": 0.5,
                    "ramp_run_m": 6.0,
                    "ramp_width_m": 1.2,
                    "fire_access_road_width_m": 7.0,
                    "evacuation_door_width_m": 0.95
                }
            }
        }
    )


class CheckResult(BaseModel):
    """QMQ/ShNQ qoidasi bo'yicha yakka tekshiruv natijasi."""
    rule_id: str = Field(..., description="Qoida kodi (masalan, UZ-FIRE-001)")
    code: str = Field(..., description="Me'yor kodi (masalan, QMQ 2.01.05-19)")
    clause: str = Field(..., description="Modda yoki band raqami")
    category: str = Field(..., description="Qoida toifasi (fire_safety, accessibility, etc.)")
    severity: Severity = Field(..., description="Muhimlik darajasi")
    status: CheckStatus = Field(..., description="Natija holati (pass, fail, etc.)")
    title_uz: str
    title_ru: str
    actual_value: Any = None
    required_value: Any = None
    message_uz: str
    message_ru: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_bbox: Optional[List[float]] = None
    source_page: Optional[int] = None
    notes: str = ""

    model_config = ConfigDict(from_attributes=True)


class CheckReportSummary(BaseModel):
    """Tekshiruvlar yig'ma statistikasi."""
    total_checks: int = Field(default=0)
    passed: int = Field(default=0)
    failed: int = Field(default=0)
    critical_failures: int = Field(default=0)
    pass_rate_percent: float = Field(default=0.0)
    ekspertiza_ready: bool = Field(default=False)


class CheckReport(BaseModel):
    """Chizma tekshiruvi bo'yicha to'liq hisobot."""
    id: str
    project_id: str
    file_name: str
    file_path: Optional[str] = None
    status: CheckJobStatus
    results: List[CheckResult] = Field(default_factory=list)
    summary: Optional[CheckReportSummary] = None
    vision_source_metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
