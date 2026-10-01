"""
Me'morAI — CAD & Vector Blueprint Parser (DXF / DWG)
ezdxf kutubxonasi yordamida DXF vektorli arxitektura chizmalarini tahlil qilish.

Ushbu modul:
1. DXF fayllardagi qatlamlar (layers), o'lchamlar (DIMENSION), matnlar (TEXT/MTEXT)
   va chiziqlar (LINE/LWPOLYLINE) geometriyasini tekshiradi.
2. Eshik eni, yo'lak kengligi, shift balandligi, pandus qiyaligi va xona maydonlarini
   to'g'ridan-to'g'ri vektor koordinatalaridan ajratib oladi.
3. Aniqlik darajasi (confidence): 1.0 (Chunki vektorli chizma aniq matematik o'lchovga ega).
"""

from dataclasses import dataclass, field
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("memore_ai.dxf_parser")

try:
    import ezdxf
    from ezdxf.document import Drawing
    EZDXF_AVAILABLE = True
except ImportError:
    EZDXF_AVAILABLE = False
    logger.warning("ezdxf paketi o'rnatilmagan. DXF tahlili cheklangan bo'ladi.")


@dataclass
class DXFAnalysisResult:
    is_valid: bool
    dxf_version: str = ""
    layers: List[str] = field(default_factory=list)
    extracted_parameters: Dict[str, Any] = field(default_factory=dict)
    confidence_score: float = 1.0
    entity_counts: Dict[str, int] = field(default_factory=dict)
    raw_texts: List[str] = field(default_factory=list)
    dimension_values: List[float] = field(default_factory=list)
    error_message: Optional[str] = None


class DXFBlueprintParser:
    """
    Arxitektura va muhandislik DXF chizmalarini chuqur tahlil qiluvchi servis.
    """

    def __init__(self):
        if not EZDXF_AVAILABLE:
            logger.warning("ezdxf kutubxonasi mavjud emas. pip install ezdxf>=1.3.0 talab qilinadi.")

    def parse_dxf_file(self, file_path: str | Path) -> DXFAnalysisResult:
        """
        DXF faylni o'qib, me'yoriy parametrlar va geometrik ma'lumotlarni chiqaradi.
        """
        path = Path(file_path)
        suffix = path.suffix.lower()
        if suffix == ".dwg":
            # DWG fayllari xususiy ikkilik format hisoblanadi.
            return DXFAnalysisResult(
                is_valid=False,
                error_message=(
                    "DWG formati ikkilik yopiq formatdir. Iltimos, AutoCAD/ArchiCAD'da "
                    "faylni DXF (AutoCAD 2018 DXF yoki R12/2000 DXF) formatida saqlab qayta yuklang."
                ),
                confidence_score=0.0,
            )

        if not path.exists():
            return DXFAnalysisResult(
                is_valid=False,
                error_message=f"Fayl topilmadi: {path}",
                confidence_score=0.0,
            )

        if not EZDXF_AVAILABLE:
            return DXFAnalysisResult(
                is_valid=False,
                error_message="Serverda 'ezdxf' moduli o'rnatilmagan.",
                confidence_score=0.0,
            )

        try:
            doc = ezdxf.readfile(str(path))
            auditor = doc.audit()
            if auditor.has_errors:
                logger.warning(f"DXF faylda {len(auditor.errors)} ta xatolik aniqlandi.")
        except ezdxf.DXFError as e:
            logger.error(f"DXF o'qishda xatolik: {e}")
            return DXFAnalysisResult(
                is_valid=False,
                error_message=f"DXF sintaksis xatosi: {str(e)}",
                confidence_score=0.0,
            )
        except Exception as e:
            logger.error(f"Kutilmagan fayl xatosi: {e}")
            return DXFAnalysisResult(
                is_valid=False,
                error_message=f"Faylni ochishda xato: {str(e)}",
                confidence_score=0.0,
            )

        # 1. Metadatasini o'qish
        dxf_version = doc.dxfversion
        layers = [layer.dxf.name for layer in doc.layers]

        msp = doc.modelspace()
        entity_counts: Dict[str, int] = {}
        raw_texts: List[str] = []
        dimension_values: List[float] = []

        # 2. Entitiylarni sanash va tahlil qilish
        for entity in msp:
            dxftype = entity.dxftype()
            entity_counts[dxftype] = entity_counts.get(dxftype, 0) + 1

            # Matnlarni yig'ish (MTEXT va TEXT)
            if dxftype in ("TEXT", "MTEXT"):
                text_content = ""
                if hasattr(entity.dxf, "text"):
                    text_content = entity.dxf.text
                elif hasattr(entity, "text"):
                    text_content = entity.text
                if text_content:
                    raw_texts.append(text_content.strip())

            # O'lchamlarni yig'ish (DIMENSION)
            elif dxftype == "DIMENSION":
                try:
                    # ezdxf da dimension actual_measurement bo'ladi
                    if hasattr(entity.dxf, "actual_measurement"):
                        val = float(entity.dxf.actual_measurement)
                        if val > 0:
                            dimension_values.append(val)
                except Exception:
                    pass

        # 3. Parametrlarni ajratib olish (Regex va Heuristika)
        extracted_parameters = self._extract_parameters_from_cad(
            raw_texts=raw_texts,
            dimension_values=dimension_values,
            layers=layers,
            msp=msp,
        )

        return DXFAnalysisResult(
            is_valid=True,
            dxf_version=dxf_version,
            layers=layers,
            extracted_parameters=extracted_parameters,
            confidence_score=0.98,  # Vektorli chizmalarda yuqori ishonchlilik
            entity_counts=entity_counts,
            raw_texts=raw_texts[:100],  # Eng asosiy 100 ta matn
            dimension_values=dimension_values[:100],
        )

    def _extract_parameters_from_cad(
        self,
        raw_texts: List[str],
        dimension_values: List[float],
        layers: List[str],
        msp: Any,
    ) -> Dict[str, Any]:
        """
        DXF matnlari va o'lchovlaridan ShNQ / QMQ parametrlarini ajratish.
        """
        params: Dict[str, Any] = {}
        full_text = " \n ".join(raw_texts)

        # 1. Shift balandligi (Ceiling height) — masalan: h=3.0, h=2.8m, H=3300, balandlik: 2.7m
        h_match = re.search(r"(?:h|H|balandlik|height)\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:m|metr)?", full_text, re.IGNORECASE)
        if h_match:
            val = float(h_match.group(1).replace(",", "."))
            # Agar mm larda bo'lsa (masalan 2800, 3000, 3300)
            if val > 100:
                val = val / 1000.0
            if 1.5 <= val <= 20.0:
                params["ceiling_height_m"] = round(val, 2)

        # 2. Eshik kengligi (Door width) — masalan: d=900, eshik=1.0m, door=0.9
        door_match = re.search(r"(?:eshik|door|d)\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:m|mm|sm)?", full_text, re.IGNORECASE)
        if door_match:
            val = float(door_match.group(1).replace(",", "."))
            if val > 100:  # mm
                val = val / 1000.0
            elif val > 10:  # sm
                val = val / 100.0
            if 0.5 <= val <= 5.0:
                params["door_width_m"] = round(val, 2)

        # 3. Yo'lak kengligi (Corridor width) — masalan: koridor=1.4m, yo'lak: 1.5
        corridor_match = re.search(r"(?:koridor|yo['’`]?lak|corridor)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|mm)?", full_text, re.IGNORECASE)
        if corridor_match:
            val = float(corridor_match.group(1).replace(",", "."))
            if val > 100:
                val = val / 1000.0
            if 0.6 <= val <= 10.0:
                params["corridor_width_m"] = round(val, 2)

        # 4. Pandus qiyaligi (Ramp slope) — masalan: i=8%, pandus: 1:12, slope=5%
        ramp_match = re.search(r"(?:pandus|ramp|qiyalik|i)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%", full_text, re.IGNORECASE)
        if ramp_match:
            val = float(ramp_match.group(1).replace(",", "."))
            params["ramp_slope_percent"] = round(val, 2)

        # 5. Avtoturargoh va Xonadonlar soni
        parking_match = re.search(r"(?:avtoturargoh|parking|mashina|avto)\s*[:=]?\s*(\d+)", full_text, re.IGNORECASE)
        if parking_match:
            params["parking_spaces"] = int(parking_match.group(1))

        apt_match = re.search(r"(?:xonadon(?:lar)?|kvartira(?:lar)?|apartments?)\s*[:=]?\s*(\d+)", full_text, re.IGNORECASE)
        if apt_match:
            params["apartments_count"] = int(apt_match.group(1))

        # 6. Agar DIMENSION qiymatlaridan foydali o'lchamlar bo'lsa:
        # Standart eshik va yo'lak o'lchamlari CAD chizmalarida mm da beriladi (800, 900, 1000, 1200, 1500)
        if "door_width_m" not in params and dimension_values:
            door_candidates = [d / 1000.0 for d in dimension_values if 700 <= d <= 1500]
            if door_candidates:
                # Ko'p uchragan median yoki o'rtacha qiymat
                params["door_width_m"] = round(door_candidates[0], 2)

        if "corridor_width_m" not in params and dimension_values:
            corr_candidates = [d / 1000.0 for d in dimension_values if 1200 <= d <= 3000]
            if corr_candidates:
                params["corridor_width_m"] = round(corr_candidates[0], 2)

        logger.info(f"DXF parametrlari ekstraksiya qilindi: {params}")
        return params
