"""
Me'morAI — DXF Blueprint Parser Unit Tests
ezdxf yordamida dinamik test DXF chizmasi yaratib, parametrlarni ajratishni tekshirish.
"""

import os
from pathlib import Path
import tempfile
import pytest

import ezdxf
from backend.services.dxf_parser import DXFBlueprintParser


def test_dxf_parser_extraction():
    # 1. Vaqtinchalik haqiqiy DXF fayl yaratish
    doc = ezdxf.new("R2010")
    msp = doc.modelspace()

    # Layerlarni qo'shish
    doc.layers.add("ANNOTATIONS")
    doc.layers.add("DOORS")
    doc.layers.add("CORRIDORS")
    doc.layers.add("RAMPS")
    doc.layers.add("GENERAL")

    # Arxitektura belgilari va matnlari
    msp.add_text("Xona 101, Balandlik h=3.0m", dxfattribs={"layer": "ANNOTATIONS"})
    msp.add_text("Asosiy Kirish eshik=1.2m", dxfattribs={"layer": "DOORS"})
    msp.add_text("Evakuatsiya yo'lak: 1.5m", dxfattribs={"layer": "CORRIDORS"})
    msp.add_text("Bosh kirish pandus qiyalik i=5%", dxfattribs={"layer": "RAMPS"})
    msp.add_text("Avtoturargoh: 60 o'rin, Xonadonlar: 50", dxfattribs={"layer": "GENERAL"})

    with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        doc.saveas(tmp_path)

        # 2. DXFBlueprintParser orqali o'qish
        parser = DXFBlueprintParser()
        result = parser.parse_dxf_file(tmp_path)

        # 3. Natijalarni tekshirish
        assert result.is_valid is True
        assert result.confidence_score >= 0.95
        assert "ANNOTATIONS" in result.layers
        assert "DOORS" in result.layers

        extracted = result.extracted_parameters
        assert extracted.get("ceiling_height_m") == 3.0
        assert extracted.get("door_width_m") == 1.2
        assert extracted.get("corridor_width_m") == 1.5
        assert extracted.get("ramp_slope_percent") == 5.0
        assert extracted.get("parking_spaces") == 60
        assert extracted.get("apartments_count") == 50

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_dwg_handling_warning():
    parser = DXFBlueprintParser()
    result = parser.parse_dxf_file("sample_drawing.dwg")
    assert result.is_valid is False
    assert "DWG formati" in result.error_message
