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


def _safe_format(template: str, **kwargs) -> str:
    """Xavfsiz matn formatlovchi: yetishmayotgan parametrlar tufayli KeyError bermaydi."""
    actual = kwargs.get("actual", kwargs.get("actual_spots", ""))
    required = kwargs.get("required", kwargs.get("min_val", ""))
    ctx = {
        "actual": actual,
        "required": required,
        "actual_spots": kwargs.get("actual_spots", actual),
        "total_apartments": kwargs.get("total_apartments", ""),
        "ratio": f"{kwargs.get('ratio', 0):.2f}" if isinstance(kwargs.get("ratio"), (int, float)) else str(kwargs.get("ratio", "")),
        **kwargs
    }
    try:
        return template.format(**ctx)
    except Exception:
        return template


class QMQRulesEngine:
    """
    O'zbekiston QMQ/ShNQ qoidalari asosida deterministic tekshiruv dvigateli.
    Har bir tekshiruv uchun aniq modda havolasi va isbot mavjud.
    """

    ID_ALIASES = {
        "UZ-ACCESS-001": "UZ-ACC-001",
        "UZ-ACCESS-002": "UZ-ACC-002",
        "UZ-ACCESSIBILITY-001": "UZ-ACC-001",
        "UZ-ACCESSIBILITY-002": "UZ-ACC-002",
        "UZ-PARKING-001": "UZ-URBAN-005",
        "UZ-CEILING-001": "UZ-RES-001",
        "UZ-FIRE-EVAC-001": "UZ-FIRE-010",
    }

    def __init__(self, rules_path: Path | str | None = None):
        if rules_path is None:
            rules_path = Path(__file__).parent / "qmq_rules_v1.json"
        with open(rules_path, encoding="utf-8") as f:
            data = json.load(f)
        self.rules: dict[str, dict] = {r["id"]: r for r in data["rules"]}  # faqat canonical, alias emas
        self.legacy_ids: dict[str, str] = {k: v for k, v in self.ID_ALIASES.items()}  # eski -> yangi lug'at
        self.meta = data["_meta"]

    def get_rule(self, rule_id: str) -> dict | None:
        """Qoidani ID yoki alias bo'yicha olish (canonical ID ga yo'naltiriladi)."""
        canonical = self.legacy_ids.get(rule_id, rule_id)
        return self.rules.get(canonical)

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
        rule = self.get_rule("UZ-ACC-001")
        rule_id = rule["id"]
        if run_m <= 0:
            return self._insufficient(rule_id, rule, "Pandus uzunligi 0 yoki noaniq")

        slope_percent = (rise_m / run_m) * 100
        max_val = rule["max_value"]
        passed = slope_percent <= max_val

        return CheckResult(
            rule_id=rule_id,
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
        rule = self.get_rule("UZ-ACC-002")
        rule_id = rule["id"]
        min_val = 1.5 if is_major_transport_hub else rule["min_value"]
        passed = actual_width_m >= min_val

        return CheckResult(
            rule_id=rule_id,
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
        rule = self.get_rule("UZ-FIRE-010")
        rule_id = rule["id"]
        type_map = {
            "residential_apartment": 0.80,
            "public_corridor": 0.90,
            "assembly_hall": 1.20,
        }
        min_val = type_map.get(building_type, 0.90)
        passed = actual_clear_width_m >= min_val

        return CheckResult(
            rule_id=rule_id,
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
        rule = self.get_rule("UZ-URBAN-005")
        rule_id = rule["id"]
        if total_apartments <= 0:
            return self._insufficient(rule_id, rule, "Xonadonlar soni noaniq")

        ratio = total_parking_spots / total_apartments
        min_val = rule["min_value"]
        passed = ratio >= min_val

        return CheckResult(
            rule_id=rule_id,
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.PASS if passed else CheckStatus.FAIL,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=round(ratio, 3),
            required_value=min_val,
            message_uz=_safe_format(
                rule["error_template_uz"],
                actual_spots=total_parking_spots,
                total_apartments=total_apartments,
                ratio=ratio,
                actual=round(ratio, 2),
                required=min_val,
            ) if not passed else f"✅ Avtoturargoh: {total_parking_spots}/{total_apartments} xonadon = {ratio:.2f}",
            message_ru=_safe_format(
                rule["error_template_ru"],
                actual_spots=total_parking_spots,
                total_apartments=total_apartments,
                ratio=ratio,
                actual=round(ratio, 2),
                required=min_val,
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
        rule = self.get_rule("UZ-RES-001")
        rule_id = rule["id"]
        min_val = 2.70 if construction_type == "new" else 2.50
        passed = actual_height_m >= min_val

        return CheckResult(
            rule_id=rule_id,
            code=rule["code"],
            clause=rule["clause"],
            category=rule["category"],
            severity=Severity(rule["severity"]),
            status=CheckStatus.PASS if passed else CheckStatus.FAIL,
            title_uz=rule["title_uz"],
            title_ru=rule["title_ru"],
            actual_value=actual_height_m,
            required_value=min_val,
            message_uz=_safe_format(
                rule["error_template_uz"],
                actual=actual_height_m,
                required=min_val,
            ) if not passed else f"✅ Shift balandligi: {actual_height_m}m ≥ {min_val}m",
            message_ru=_safe_format(
                rule["error_template_ru"],
                actual=actual_height_m,
                required=min_val,
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
        rule = self.get_rule("UZ-SEISMIC-001")
        return rule["zones"].get(city) if rule else None

    # ─────────────────────────────────────────
    # YORDAMCHI METODLAR
    # ─────────────────────────────────────────

    def _insufficient(
        self, rule_id: str, rule: dict, reason: str
    ) -> CheckResult:
        canonical_id = self.legacy_ids.get(rule_id, rule_id)
        return CheckResult(
            rule_id=canonical_id,
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

        # Dinamik qoidalar (50+ ta me'yor avtomatik baholanadi)
        checked_rules = {self.legacy_ids.get(r.rule_id, r.rule_id) for r in results}
        for rule_id, rule in self.rules.items():
            if rule_id in checked_rules:
                continue
            metric = rule.get("metric")
            if not metric or metric not in building_data:
                continue
            
            actual_val = building_data[metric]
            check_type = rule.get("check_type", "min_value")
            passed = True
            req_val = rule.get("min_value")

            if check_type == "min_value":
                min_v = rule.get("min_value", 0.0)
                req_val = min_v
                passed = float(actual_val) >= float(min_v)
            elif check_type == "max_value":
                max_v = rule.get("max_value", 0.0)
                req_val = max_v
                passed = float(actual_val) <= float(max_v)
            elif check_type == "range":
                min_v = rule.get("min_value", 0.0)
                max_v = rule.get("max_value", float("inf"))
                req_val = f"{min_v} - {max_v}"
                passed = float(min_v) <= float(actual_val) <= float(max_v)

            msg_uz = _safe_format(rule.get("error_template_uz", ""), actual=actual_val, required=req_val) if not passed else f"✅ {rule.get('title_uz')}: {actual_val} {rule.get('unit', '')}"
            msg_ru = _safe_format(rule.get("error_template_ru", ""), actual=actual_val, required=req_val) if not passed else f"✅ {rule.get('title_ru')}: {actual_val} {rule.get('unit', '')}"

            results.append(CheckResult(
                rule_id=rule_id,
                code=rule.get("code", "ShNQ"),
                clause=rule.get("clause", ""),
                category=rule.get("category", "umumiy"),
                severity=Severity(rule.get("severity", "high")),
                status=CheckStatus.PASS if passed else CheckStatus.FAIL,
                title_uz=rule.get("title_uz", ""),
                title_ru=rule.get("title_ru", ""),
                actual_value=actual_val,
                required_value=req_val,
                message_uz=msg_uz,
                message_ru=msg_ru,
            ))
            checked_rules.add(rule_id)

        return results

    def summary(self, results: list[CheckResult]) -> dict:
        total = len(results)
        passed = sum(r.status == CheckStatus.PASS for r in results)
        failed = sum(r.status == CheckStatus.FAIL for r in results)
        unknown = sum(
            r.status in (CheckStatus.INSUFFICIENT_EVIDENCE, CheckStatus.REQUIRES_REVIEW)
            for r in results
        )
        critical_failed = sum(
            r.status == CheckStatus.FAIL and r.severity == Severity.CRITICAL
            for r in results
        )
        coverage = total / max(len(self.rules), 1)  # canonical qoidalar soni
        return {
            "total_checks": total,
            "passed": passed,
            "failed": failed,
            "unknown": unknown,
            "critical_failures": critical_failed,
            "coverage_percent": round(coverage * 100, 1),
            "pass_rate_percent": round(passed / max(total, 1) * 100, 1),
            "ekspertiza_ready": total > 0 and failed == 0 and unknown == 0,
        }
