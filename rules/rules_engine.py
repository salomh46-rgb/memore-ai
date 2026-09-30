"""
Me'morAI — QMQ/ShNQ Qoidalar Dvigateli (Rules Engine)
Versiya: 1.0.0
Rasmiy hujjatlar: mc.uz asosida

Bu modul deterministic (hisob-kitobga asoslangan) tekshiruvlar uchun.
AI Vision faqat geometriya extraction uchun ishlatiladi,
pass/fail qorori bu dvigatel tomonidan aniqlanadi.
"""
import json
import math
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any


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


@dataclass
class CheckResult:
    rule_id: str
    code: str
    clause: str
    category: str
    severity: Severity
    status: CheckStatus
    title_uz: str
    title_ru: str
    actual_value: Any
    required_value: Any
    message_uz: str
    message_ru: str
    confidence: float = 1.0
    evidence_bbox: list[float] | None = None
    source_page: int | None = None
    notes: str = ""


class QMQRulesEngine:
    """
    O'zbekiston QMQ/ShNQ qoidalari asosida deterministic tekshiruv dvigateli.
    Har bir tekshiruv uchun aniq modda havolasi va isbot mavjud.
    """

    def __init__(self, rules_path: Path | str | None = None):
        if rules_path is None:
            rules_path = Path(__file__).parent / "qmq_rules_v1.json"
        with open(rules_path, encoding="utf-8") as f:
            data = json.load(f)
        self.rules: dict[str, dict] = {r["id"]: r for r in data["rules"]}
        self.meta = data["_meta"]

    # ─────────────────────────────────────────
    # 1. YONG'IN XAVFSIZLIGI
    # ─────────────────────────────────────────

    def check_fire_access_road_width(
        self,
        actual_width_m: float,
        confidence: float = 1.0,
        source_page: int | None = None,
        evidence_bbox: list[float] | None = None,
    ) -> CheckResult:
        rule = self.rules["UZ-FIRE-001"]
        min_val = rule["min_value"]
        passed = actual_width_m >= min_val

        return CheckResult(
            rule_id="UZ-FIRE-001",
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.PASS if passed else CheckStatus.FAIL,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=actual_width_m,
            required_value=min_val,
            message_uz=rule["error_template_uz"].format(
                actual=actual_width_m, required=min_val
            ) if not passed else f"✅ Yong'in o'tish yo'li: {actual_width_m}m ≥ {min_val}m",
            message_ru=rule["error_template_ru"].format(
                actual=actual_width_m, required=min_val
            ) if not passed else f"✅ Проезд пожарной техники: {actual_width_m}м ≥ {min_val}м",
            confidence=confidence,
            source_page=source_page,
            evidence_bbox=evidence_bbox,
        )

    def check_fire_separation_distance(
        self,
        actual_distance_m: float,
        fire_resistance_degree: int = 1,
        both_highrise: bool = False,
        confidence: float = 1.0,
        source_page: int | None = None,
    ) -> CheckResult:
        rule = self.rules["UZ-FIRE-003"]
        if both_highrise:
            min_val = 30.0
            condition = "between_two_highrise"
        elif fire_resistance_degree in (1, 2):
            min_val = 15.0
            condition = "fire_resistance_I_or_II"
        else:
            min_val = 25.0
            condition = "fire_resistance_III_or_IV"

        passed = actual_distance_m >= min_val
        return CheckResult(
            rule_id="UZ-FIRE-003",
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.PASS if passed else CheckStatus.FAIL,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=actual_distance_m,
            required_value=min_val,
            message_uz=rule["error_template_uz"].format(
                actual=actual_distance_m, required=min_val
            ) if not passed else f"✅ Yong'in oraliq: {actual_distance_m}m ≥ {min_val}m",
            message_ru=rule["error_template_ru"].format(
                actual=actual_distance_m, required=min_val
            ) if not passed else f"✅ Противопожарный разрыв: {actual_distance_m}м ≥ {min_val}м",
            confidence=confidence,
            source_page=source_page,
            notes=f"Shartlar: {condition}",
        )

    # ─────────────────────────────────────────
    # 2. INKLUZIVLIK (NOGIRONLAR)
    # ─────────────────────────────────────────

    def check_ramp_slope(
        self,
        rise_m: float,
        run_m: float,
        confidence: float = 1.0,
        source_page: int | None = None,
        evidence_bbox: list[float] | None = None,
    ) -> CheckResult:
        rule = self.rules["UZ-ACCESS-001"]
        if run_m <= 0:
            return self._insufficient("UZ-ACCESS-001", rule, "Pandus uzunligi 0 yoki noaniq")

        slope_percent = (rise_m / run_m) * 100
        max_val = rule["max_value"]
        passed = slope_percent <= max_val

        return CheckResult(
            rule_id="UZ-ACCESS-001",
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.PASS if passed else CheckStatus.FAIL,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=round(slope_percent, 2),
            required_value=max_val,
            message_uz=rule["error_template_uz"].format(
                actual=round(slope_percent, 2), required=max_val
            ) if not passed else f"✅ Pandus qiyaligi: {slope_percent:.2f}% ≤ {max_val}%",
            message_ru=rule["error_template_ru"].format(
                actual=round(slope_percent, 2), required=max_val
            ) if not passed else f"✅ Уклон пандуса: {slope_percent:.2f}% ≤ {max_val}%",
            confidence=confidence,
            source_page=source_page,
            evidence_bbox=evidence_bbox,
        )

    def check_ramp_width(
        self,
        actual_width_m: float,
        is_major_transport_hub: bool = False,
        confidence: float = 1.0,
        source_page: int | None = None,
    ) -> CheckResult:
        rule = self.rules["UZ-ACCESS-002"]
        min_val = 1.5 if is_major_transport_hub else rule["min_value"]
        passed = actual_width_m >= min_val

        return CheckResult(
            rule_id="UZ-ACCESS-002",
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.PASS if passed else CheckStatus.FAIL,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=actual_width_m,
            required_value=min_val,
            message_uz=rule["error_template_uz"].format(
                actual=actual_width_m, required=min_val
            ) if not passed else f"✅ Pandus kengligi: {actual_width_m}m ≥ {min_val}m",
            message_ru=rule["error_template_ru"].format(
                actual=actual_width_m, required=min_val
            ) if not passed else f"✅ Ширина пандуса: {actual_width_m}м ≥ {min_val}м",
            confidence=confidence,
            source_page=source_page,
        )

    # ─────────────────────────────────────────
    # 3. EVAKUATSIYA ESHIKLARI
    # ─────────────────────────────────────────

    def check_evacuation_door_width(
        self,
        actual_clear_width_m: float,
        building_type: str = "public_corridor",
        confidence: float = 1.0,
        source_page: int | None = None,
        evidence_bbox: list[float] | None = None,
    ) -> CheckResult:
        rule = self.rules["UZ-FIRE-EVAC-001"]
        type_map = {
            "residential_apartment": 0.80,
            "public_corridor": 0.90,
            "assembly_hall": 1.20,
        }
        min_val = type_map.get(building_type, 0.90)
        passed = actual_clear_width_m >= min_val

        return CheckResult(
            rule_id="UZ-FIRE-EVAC-001",
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.PASS if passed else CheckStatus.FAIL,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=actual_clear_width_m,
            required_value=min_val,
            message_uz=rule["error_template_uz"].format(
                actual=actual_clear_width_m, required=min_val
            ) if not passed else f"✅ Evakuatsiya eshigi: {actual_clear_width_m}m ≥ {min_val}m",
            message_ru=rule["error_template_ru"].format(
                actual=actual_clear_width_m, required=min_val
            ) if not passed else f"✅ Эвакуационная дверь: {actual_clear_width_m}м ≥ {min_val}м",
            confidence=confidence,
            source_page=source_page,
            evidence_bbox=evidence_bbox,
            notes=f"Bino turi: {building_type}",
        )

    # ─────────────────────────────────────────
    # 4. AVTOTURARGOH
    # ─────────────────────────────────────────

    def check_parking_ratio(
        self,
        total_parking_spots: int,
        total_apartments: int,
        building_type: str = "residential",
        confidence: float = 1.0,
        source_page: int | None = None,
    ) -> CheckResult:
        rule = self.rules["UZ-PARKING-001"]
        if total_apartments <= 0:
            return self._insufficient("UZ-PARKING-001", rule, "Xonadonlar soni noaniq")

        ratio = total_parking_spots / total_apartments
        min_val = rule["min_value"]
        passed = ratio >= min_val

        return CheckResult(
            rule_id="UZ-PARKING-001",
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.PASS if passed else CheckStatus.FAIL,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=round(ratio, 3),
            required_value=min_val,
            message_uz=rule["error_template_uz"].format(
                actual_spots=total_parking_spots,
                total_apartments=total_apartments,
                ratio=ratio,
            ) if not passed else f"✅ Avtoturargoh: {total_parking_spots}/{total_apartments} xonadon = {ratio:.2f}",
            message_ru=rule["error_template_ru"].format(
                actual_spots=total_parking_spots,
                total_apartments=total_apartments,
                ratio=ratio,
            ) if not passed else f"✅ Паркомест: {total_parking_spots}/{total_apartments} квартир = {ratio:.2f}",
            confidence=confidence,
            source_page=source_page,
        )

    # ─────────────────────────────────────────
    # 5. SHIFT BALANDLIGI
    # ─────────────────────────────────────────

    def check_ceiling_height(
        self,
        actual_height_m: float,
        construction_type: str = "new",
        confidence: float = 1.0,
        source_page: int | None = None,
        evidence_bbox: list[float] | None = None,
    ) -> CheckResult:
        rule = self.rules["UZ-CEILING-001"]
        min_val = 2.70 if construction_type == "new" else 2.50
        passed = actual_height_m >= min_val

        return CheckResult(
            rule_id="UZ-CEILING-001",
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.PASS if passed else CheckStatus.FAIL,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=actual_height_m,
            required_value=min_val,
            message_uz=rule["error_template_uz"].format(
                actual=actual_height_m
            ) if not passed else f"✅ Shift balandligi: {actual_height_m}m ≥ {min_val}m",
            message_ru=rule["error_template_ru"].format(
                actual=actual_height_m
            ) if not passed else f"✅ Высота потолка: {actual_height_m}м ≥ {min_val}м",
            confidence=confidence,
            source_page=source_page,
            evidence_bbox=evidence_bbox,
            notes=f"Qurilish turi: {construction_type}",
        )

    # ─────────────────────────────────────────
    # 6. SEYSMIKA
    # ─────────────────────────────────────────

    def get_seismic_zone(self, city: str) -> int | None:
        rule = self.rules["UZ-SEISMIC-001"]
        return rule["zones"].get(city)

    # ─────────────────────────────────────────
    # YORDAMCHI METODLAR
    # ─────────────────────────────────────────

    def _insufficient(
        self, rule_id: str, rule: dict, reason: str
    ) -> CheckResult:
        return CheckResult(
            rule_id=rule_id,
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.INSUFFICIENT_EVIDENCE,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=None,
            required_value=None,
            message_uz=f"⚠️ Yetarli ma'lumot yo'q: {reason}",
            message_ru=f"⚠️ Недостаточно данных: {reason}",
            confidence=0.0,
        )

    def run_all_checks(self, building_data: dict) -> list[CheckResult]:
        """
        Bitta bino uchun barcha tegishli tekshiruvlarni ketma-ket o'tkazadi.
        building_data = {
            'type': 'residential',
            'construction_type': 'new',
            'city': 'Toshkent',
            'ceiling_height_m': 2.8,
            'apartments': 48,
            'parking_spots': 50,
            'ramp_rise_m': 0.5,
            'ramp_run_m': 6.0,
            'ramp_width_m': 1.2,
            'fire_access_road_width_m': 7.0,
            'evacuation_door_width_m': 0.95,
            ...
        }
        """
        results: list[CheckResult] = []

        if "ceiling_height_m" in building_data:
            results.append(self.check_ceiling_height(
                building_data["ceiling_height_m"],
                construction_type=building_data.get("construction_type", "new"),
            ))

        if "apartments" in building_data and "parking_spots" in building_data:
            results.append(self.check_parking_ratio(
                building_data["parking_spots"],
                building_data["apartments"],
            ))

        if "ramp_rise_m" in building_data and "ramp_run_m" in building_data:
            results.append(self.check_ramp_slope(
                building_data["ramp_rise_m"],
                building_data["ramp_run_m"],
            ))

        if "ramp_width_m" in building_data:
            results.append(self.check_ramp_width(building_data["ramp_width_m"]))

        if "fire_access_road_width_m" in building_data:
            results.append(self.check_fire_access_road_width(
                building_data["fire_access_road_width_m"]
            ))

        if "evacuation_door_width_m" in building_data:
            results.append(self.check_evacuation_door_width(
                building_data["evacuation_door_width_m"],
                building_type=building_data.get("building_type_evac", "public_corridor"),
            ))

        return results

    def summary(self, results: list[CheckResult]) -> dict:
        total = len(results)
        passed = sum(1 for r in results if r.status == CheckStatus.PASS)
        failed = sum(1 for r in results if r.status == CheckStatus.FAIL)
        critical_failed = sum(
            1 for r in results
            if r.status == CheckStatus.FAIL and r.severity == Severity.CRITICAL
        )
        return {
            "total_checks": total,
            "passed": passed,
            "failed": failed,
            "critical_failures": critical_failed,
            "pass_rate_percent": round(passed / total * 100, 1) if total else 0,
            "ekspertiza_ready": failed == 0,
        }
