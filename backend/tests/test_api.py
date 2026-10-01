"""
Me'morAI — Backend API Testlari
FastAPI endpointlarini avtomatlashtirilgan tekshiruvi.
"""
import io
import json
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.auth import AuthenticatedUser, get_current_user

app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
    user_id="00000000-0000-0000-0000-000000000001",
    email="test@memore.uz",
    organization_id="a0000000-0000-0000-0000-000000000001",
    role="admin",
)

client = TestClient(app)


def test_health_check():
    """Health check endpointini tekshirish."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "services" in data
    assert data["services"]["rules_engine"] == "ready"


def test_create_and_get_project():
    """Loyiha yaratish va uni ID bo'yicha qaytarib olish."""
    payload = {
        "name": "Toshkent City Blok 1",
        "description": "Premium darajadagi turar-joy majmuasi",
        "building_type": "residential",
        "address": "Toshkent sh., Shayxontohur tumani",
        "metadata": {
            "floors": 12,
            "construction_type": "new"
        }
    }
    # 1. POST /api/projects
    create_res = client.post("/api/projects", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert "id" in created
    assert created["name"] == payload["name"]
    project_id = created["id"]

    # 2. GET /api/projects
    list_res = client.get("/api/projects")
    assert list_res.status_code == 200
    projects = list_res.json()
    assert any(p["id"] == project_id for p in projects)

    # 3. GET /api/projects/{id}
    get_res = client.get(f"/api/projects/{project_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == project_id
    assert fetched["building_type"] == "residential"


def test_get_nonexistent_project():
    """Mavjud bo'lmagan loyiha uchun 404 qaytishi kerak."""
    response = client.get("/api/projects/proj_non_existent_999")
    assert response.status_code == 404
    assert "Loyiha topilmadi" in response.json()["detail"]


def test_run_check_and_get_result():
    """Chizma faylini yuklash, tekshirish va hisobot olish."""
    # 1. Loyiha yaratish
    proj_res = client.post("/api/projects", json={
        "name": "Audit Test Majmuasi",
        "building_type": "residential",
    })
    project_id = proj_res.json()["id"]

    # 2. Bino parametrlari (QMQ tekshiruvlari uchun)
    building_data = {
        "construction_type": "new",
        "ceiling_height_m": 2.8,  # QMQ bo'yicha pass (min 2.7m)
        "apartments": 50,
        "parking_spots": 60,      # QMQ bo'yicha pass (min 50)
        "ramp_rise_m": 0.5,
        "ramp_run_m": 6.0,
        "ramp_width_m": 1.2,
        "fire_access_road_width_m": 6.5,
        "evacuation_door_width_m": 0.95
    }

    # 3. Fayl yuklash POST /api/checks/run
    dummy_file_content = b"%PDF-1.4 Mock architectural drawing file content for testing"
    files = {
        "file": ("architectural_plan.pdf", io.BytesIO(dummy_file_content), "application/pdf")
    }
    data = {
        "project_id": project_id,
        "building_data": json.dumps(building_data)
    }

    run_res = client.post("/api/checks/run", files=files, data=data)
    assert run_res.status_code == 202
    run_data = run_res.json()
    assert "id" in run_data
    check_id = run_data["id"]
    assert run_data["project_id"] == project_id

    # 4. Tekshiruv natijasini olish GET /api/checks/{id}
    check_res = client.get(f"/api/checks/{check_id}")
    assert check_res.status_code == 200
    report = check_res.json()
    assert report["id"] == check_id
    assert report["status"] in ["pending", "completed", "requires_review"]
    if report["status"] in ["completed", "requires_review"]:
        assert report["summary"] is not None
        assert report["summary"]["total_checks"] > 0
        assert "vision_source_metadata" in report
        assert report["vision_source_metadata"]["extraction_source"] == "extraction_failed"
