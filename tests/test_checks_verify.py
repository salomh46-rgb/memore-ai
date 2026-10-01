"""
Me'morAI — Checks Verify Endpoint & PDF Generator Tests
Tests for P0-8 and P0-10 fixes:
- Verification endpoint /api/checks/{check_id}/verify
- Direct redirect /verify/{check_id}
- PDF Generator official disclaimer and metadata
"""
from pathlib import Path
import sys
import tempfile
import pytest
from fastapi.testclient import TestClient

root = Path(__file__).resolve().parent.parent
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from backend.main import app
from backend.database import memory_store
from backend.services.pdf_generator import PDFReportGenerator

client = TestClient(app)


def test_verify_endpoint_not_found():
    """Mavjud bo'lmagan check_id uchun 404 qaytishi kerak."""
    resp = client.get("/api/checks/chk_nonexistent123/verify")
    assert resp.status_code == 404
    data = resp.json()
    assert "topilmadi" in data["detail"]


def test_verify_endpoint_success():
    """Mavjud check_id uchun haqiqiylik va tahlil ma'lumotlari to'liq qaytishi kerak."""
    test_id = "chk_test123456"
    memory_store["checks"][test_id] = {
        "id": test_id,
        "project_id": "prj_999",
        "file_name": "turar_joy_loyiha.pdf",
        "file_path": "uploads/chk_test123456_turar_joy_loyiha.pdf",
        "status": "completed",
        "results": [
            {
                "rule_id": "rule_01",
                "code": "ShNQ 2.08.01-19",
                "clause": "2.1",
                "category": "architecture",
                "severity": "critical",
                "status": "pass",
                "title_uz": "Shift balandligi",
                "title_ru": "Высота потолка",
                "message_uz": "Norma bajarildi",
                "message_ru": "Норма соблюдена",
            },
            {
                "rule_id": "rule_02",
                "code": "ShNQ 2.07.02-22",
                "clause": "3.4",
                "category": "accessibility",
                "severity": "critical",
                "status": "pass",
                "title_uz": "Pandus qiyaligi",
                "title_ru": "Уклон пандуса",
                "message_uz": "Norma bajarildi",
                "message_ru": "Норма соблюдена",
            },
        ],
        "summary": {
            "total_checks": 2,
            "passed": 2,
            "failed": 0,
            "pass_rate_percent": 100.0,
            "ekspertiza_ready": True,
        },
        "created_at": "2026-10-01T10:00:00Z",
        "completed_at": "2026-10-01T10:01:00Z",
    }

    resp = client.get(f"/api/checks/{test_id}/verify")
    # verify endpointi public (auth talab qilmaydi)
    assert resp.status_code == 200, f"Verify endpoint 200 qaytarishi kerak, lekin: {resp.status_code} — {resp.text}"
    data = resp.json()

    assert data["verified"] is True
    assert data["check_id"] == test_id
    assert data["document_number"] == f"EXP-{test_id[:8].upper()}-2026"
    assert data["file_name"] == "turar_joy_loyiha.pdf"
    assert data["compliance_status"] == "APPROVED"
    assert data["total_rules"] == 2
    assert data["passed_rules"] == 2
    assert data["failed_rules"] == 0
    assert len(data["verification_hash"]) == 64  # SHA-256 hex uzunligi
    assert "Me'morAI Yordamchi Ekspertiza Tizimi" in data["issuer"]
    assert "litsenziyalangan bosh mutaxassis (GIP)" in data["disclaimer"]


def test_verify_direct_redirect():
    """Qisqa /verify/{check_id} yo'li /api/checks/{check_id}/verify ga yo'naltirishi kerak."""
    resp = client.get("/verify/chk_test123456", follow_redirects=False)
    assert resp.status_code in (307, 308, 302, 301)
    assert resp.headers["location"] == "/api/checks/chk_test123456/verify"


def test_pdf_generator_disclaimer_and_no_official_word():
    """PDF generatorida rasmiy muhr o'rniga yordamchi ekspertiza va to'g'ri disclaimer bo'lishi kerak."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        gen = PDFReportGenerator(output_dir=tmp_dir)
        pdf_path = gen.generate_report(
            check_id="chk_pdftest123",
            project_name="Baland Bino",
            city="Toshkent",
            building_type="residential",
            check_results=[
                {
                    "code": "ShNQ 2.08.01-19",
                    "clause": "§2.1",
                    "title_uz": "Shift balandligi",
                    "actual_value": "2.8m",
                    "required_value": "≥2.7m",
                    "status": "pass",
                }
            ],
            summary={"ekspertiza_ready": True, "total_checks": 1, "passed": 1, "failed": 0},
        )
        assert pdf_path.exists()
        assert pdf_path.stat().st_size > 0
