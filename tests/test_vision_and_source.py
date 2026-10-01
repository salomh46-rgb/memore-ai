"""
Me'morAI — P0-2 va P0-3 Himoya Testlari
P0-3: Gemini Vision fail-closed (soxta fallback o'chirilgan, extraction_failed holati, prompt gallyutsinatsiya himoyasi)
P0-2: Qiymat manbasi belgisi (Value source tagging, foydalanuvchi chizmadagi qiymatni yozib tashlay olmasligi, conflict belgisi, requires_review holati)
"""
import asyncio
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest

from backend.services.vision_analyzer import GeminiVisionAnalyzer, VISION_PROMPT
from backend.tasks import execute_process_drawing


def test_vision_prompt_no_hallucination_instruction():
    """VISION_PROMPT da gallyutsinatsiyaga undovchi ko'rsatma yo'qligini tekshirish."""
    assert "eng yaqin ehtimolli qiymatni kirit" not in VISION_PROMPT
    assert "aslo taxminiy yoki uydirma qiymat kiritma" in VISION_PROMPT


def test_heuristic_fallback_returns_empty_dict():
    """_heuristic_fallback() soxta o'lchamlarsiz bo'sh dict qaytarishi shart."""
    analyzer = GeminiVisionAnalyzer(api_key=None)
    fallback = analyzer._heuristic_fallback("test_plan.pdf")
    assert fallback == {}
    # Hech qanday soxta arxitektura parametri bo'lmasligi kerak
    assert "ceiling_height_m" not in fallback
    assert "evacuation_door_width_m" not in fallback
    assert "ramp_slope_percent" not in fallback
    assert "column_min_dimension_mm" not in fallback


def test_vision_fail_closed_on_missing_api_key_or_file():
    """API kalitsiz yoki faylsiz fail-closed holatida extraction_failed qaytishi kerak."""
    analyzer = GeminiVisionAnalyzer(api_key="")
    
    # 1. Mavjud bo'lmagan fayl
    res_non_existent = asyncio.run(analyzer.analyze_drawing_file("non_existent_blueprint.pdf"))
    assert res_non_existent == {"extraction_source": "extraction_failed"}
    assert "ceiling_height_m" not in res_non_existent

    # 2. Kalitsiz mavjud fayl
    local_dummy = Path("backend/tests/test_api.py")
    res_no_key = asyncio.run(analyzer.analyze_drawing_file(local_dummy))
    assert res_no_key == {"extraction_source": "extraction_failed"}
    assert "ceiling_height_m" not in res_no_key


def test_p0_2_user_cannot_override_extracted_params():
    """
    P0-2 Xavfsizlik testi:
    Foydalanuvchi chizmadan olingan kamchilikli parametrni (masalan shift 2.4m)
    o'zining building_data si orqali (shift 3.0m) yozib tashlay olmasligi shart!
    Chizmadagi qiymat saqlanadi, conflict=True bo'ladi.
    """
    local_dummy = Path("backend/tests/test_api.py")

    # Gemini Vision chizmadan 2.40m (QMQ bo'yicha FAIL) aniqladi deb tasavvur qilamiz
    mock_extracted = {
        "ceiling_height_m": 2.40,
        "evacuation_door_width_m": 0.80,
        "extraction_source": "gemini_vision",
        "confidence_score": 0.95,
    }

    async def mock_analyze(*args, **kwargs):
        return mock_extracted

    with patch.object(GeminiVisionAnalyzer, "analyze_drawing_file", side_effect=mock_analyze):
        # Yovuz foydalanuvchi soxta pass olish uchun balandroq shift yuboradi
        user_declared_data = {
            "ceiling_height_m": 3.00,  # Foydalanuvchi da'vo qilgan soxta qiymat
            "city": "Toshkent",
            "building_type": "residential",
        }

        result = execute_process_drawing(
            check_id="chk_test_security_p02",
            file_path=str(local_dummy),
            building_data=user_declared_data,
        )

        assert result["status"] == "completed"
        meta = result["vision_source_metadata"]
        assert meta["extraction_source"] == "gemini_vision"
        assert meta["has_conflicts"] is True

        values_with_source = meta["values_with_source"]
        # Chizmadan olingan qiymat o'zgarmagan bo'lishi kerak!
        assert values_with_source["ceiling_height_m"]["value"] == 2.40
        assert values_with_source["ceiling_height_m"]["source"] == "extracted"
        assert values_with_source["ceiling_height_m"]["user_declared"] == 3.00
        assert values_with_source["ceiling_height_m"]["conflict"] is True

        # Faqat foydalanuvchi kiritgan yangi parametrlar 'user_declared' bo'ladi
        assert values_with_source["city"]["source"] == "user_declared"
        assert values_with_source["city"]["value"] == "Toshkent"


def test_vision_failure_sets_requires_review_status():
    """
    Vision xatolik bersa yoki parametr ajrata olmasa,
    tizim qulamasligi va holat 'requires_review' ga o'tishi kerak.
    """
    local_dummy = Path("backend/tests/test_api.py")

    async def mock_fail(*args, **kwargs):
        return {"extraction_source": "extraction_failed"}

    with patch.object(GeminiVisionAnalyzer, "analyze_drawing_file", side_effect=mock_fail):
        result = execute_process_drawing(
            check_id="chk_test_requires_review",
            file_path=str(local_dummy),
            building_data={"apartments": 20, "parking_spots": 25},
        )

        assert result["status"] == "requires_review"
        assert result["vision_source_metadata"]["extraction_source"] == "extraction_failed"
        assert result["vision_source_metadata"]["extraction_failed"] is True
