"""
Me'morAI — QMQ/ShNQ Qoidalar Dvigateli Testlari
pytest orqali ishga tushirish: pytest test_rules_engine.py -v
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from rules_engine import CheckStatus, QMQRulesEngine, Severity

engine = QMQRulesEngine(Path(__file__).parent / "qmq_rules_v1.json")


# ─── PANDUS QIYALIGI TESTLARI ───────────────────────────────

def test_ramp_slope_pass():
    """Pandus qiyaligi 7% (rise=0.7, run=10) — o'tishi kerak"""
    r = engine.check_ramp_slope(rise_m=0.7, run_m=10.0)  # 7.0%
    assert r.status == CheckStatus.PASS, f"FAIL: {r.message_uz}"
    print(f"[OK] {r.message_uz}")


def test_ramp_slope_fail_steep():
    """Pandus qiyaligi 1:8 = 12.5% — muvaffaqiyatsiz bo'lishi kerak"""
    r = engine.check_ramp_slope(rise_m=0.5, run_m=4.0)  # 12.5% — juda tik
    assert r.status == CheckStatus.FAIL, f"❌ PASS bo'lmasligi kerak edi"
    assert r.severity == Severity.CRITICAL
    print(f"✅ To'g'ri rad etildi: {r.message_uz}")


def test_ramp_slope_borderline():
    """Pandus qiyaligi 8.0% — o'tishi kerak (8.0 <= 8.33)"""
    r = engine.check_ramp_slope(rise_m=0.8, run_m=10.0)  # 8.0%
    assert r.status == CheckStatus.PASS
    print(f"[OK] Chegara qiymati o'tdi: {r.actual_value}%")


# ─── PANDUS KENGLIGI TESTLARI ───────────────────────────────

def test_ramp_width_pass():
    """Pandus kengligi 1.2m — o'tishi kerak"""
    r = engine.check_ramp_width(actual_width_m=1.2)
    assert r.status == CheckStatus.PASS
    print(f"✅ {r.message_uz}")


def test_ramp_width_fail():
    """Pandus kengligi 0.8m — muvaffaqiyatsiz"""
    r = engine.check_ramp_width(actual_width_m=0.8)
    assert r.status == CheckStatus.FAIL
    print(f"✅ To'g'ri rad etildi: {r.message_uz}")


# ─── AVTOTURARGOH TESTLARI ───────────────────────────────────

def test_parking_ratio_pass():
    """52 ta joy / 48 xonadon = 1.08 — o'tishi kerak"""
    r = engine.check_parking_ratio(total_parking_spots=52, total_apartments=48)
    assert r.status == CheckStatus.PASS
    print(f"✅ {r.message_uz}")


def test_parking_ratio_fail():
    """30 ta joy / 48 xonadon = 0.625 — muvaffaqiyatsiz"""
    r = engine.check_parking_ratio(total_parking_spots=30, total_apartments=48)
    assert r.status == CheckStatus.FAIL
    assert r.actual_value < 1.0
    print(f"✅ To'g'ri rad etildi: {r.message_uz}")


def test_parking_ratio_exact():
    """48 ta joy / 48 xonadon = 1.0 — chegarada, o'tishi kerak"""
    r = engine.check_parking_ratio(total_parking_spots=48, total_apartments=48)
    assert r.status == CheckStatus.PASS
    print(f"✅ Chegara: {r.actual_value}")


# ─── SHIFT BALANDLIGI TESTLARI ───────────────────────────────

def test_ceiling_height_new_pass():
    """Yangi qurilish 2.8m — o'tishi kerak"""
    r = engine.check_ceiling_height(actual_height_m=2.8, construction_type="new")
    assert r.status == CheckStatus.PASS
    print(f"✅ {r.message_uz}")


def test_ceiling_height_new_fail():
    """Yangi qurilish 2.5m — muvaffaqiyatsiz (< 2.7m)"""
    r = engine.check_ceiling_height(actual_height_m=2.5, construction_type="new")
    assert r.status == CheckStatus.FAIL
    print(f"✅ To'g'ri rad etildi: {r.message_uz}")


def test_ceiling_height_reconstruction_pass():
    """Rekonstruksiya 2.6m — o'tishi kerak (≥ 2.5m)"""
    r = engine.check_ceiling_height(actual_height_m=2.6, construction_type="reconstruction")
    assert r.status == CheckStatus.PASS
    print(f"✅ {r.message_uz}")


# ─── EVAKUATSIYA ESHIGI TESTLARI ─────────────────────────────

def test_evacuation_door_public_pass():
    """Jamoat binosi eshigi 0.95m — o'tishi kerak"""
    r = engine.check_evacuation_door_width(0.95, "public_corridor")
    assert r.status == CheckStatus.PASS
    print(f"✅ {r.message_uz}")


def test_evacuation_door_public_fail():
    """Jamoat binosi eshigi 0.85m — muvaffaqiyatsiz (< 0.9m)"""
    r = engine.check_evacuation_door_width(0.85, "public_corridor")
    assert r.status == CheckStatus.FAIL
    print(f"✅ To'g'ri rad etildi: {r.message_uz}")


def test_evacuation_door_apartment_pass():
    """Xonadon eshigi 0.85m — o'tishi kerak (≥ 0.8m)"""
    r = engine.check_evacuation_door_width(0.85, "residential_apartment")
    assert r.status == CheckStatus.PASS
    print(f"✅ {r.message_uz}")


# ─── YONG'IN O'TISH YO'LI TESTLARI ──────────────────────────

def test_fire_road_pass():
    """6m yong'in yo'li — o'tishi kerak"""
    r = engine.check_fire_access_road_width(6.0)
    assert r.status == CheckStatus.PASS
    print(f"✅ {r.message_uz}")


def test_fire_road_fail():
    """4m yong'in yo'li — muvaffaqiyatsiz"""
    r = engine.check_fire_access_road_width(4.0)
    assert r.status == CheckStatus.FAIL
    print(f"✅ To'g'ri rad etildi: {r.message_uz}")


# ─── SEYSMIKA TESTLARI ───────────────────────────────────────

def test_seismic_tashkent():
    """Toshkent — 9 ball"""
    zone = engine.get_seismic_zone("Toshkent")
    assert zone == 9
    print(f"✅ Toshkent seysmikasi: {zone} ball")


def test_seismic_bukhara():
    """Buxoro — 8 ball"""
    zone = engine.get_seismic_zone("Buxoro")
    assert zone == 8
    print(f"✅ Buxoro seysmikasi: {zone} ball")


# ─── TO'LIQ BINO TEKSHIRUVI (INTEGRATSIYA TESTI) ────────────

def test_full_building_check_passing():
    """To'liq bino barcha me'yorlarga mos — hammasi o'tishi kerak"""
    building = {
        "type": "residential",
        "construction_type": "new",
        "city": "Toshkent",
        "ceiling_height_m": 2.8,
        "apartments": 48,
        "parking_spots": 52,
        "ramp_rise_m": 0.5,
        "ramp_run_m": 6.5,  # ~7.7% — o'tadi
        "ramp_width_m": 1.2,
        "fire_access_road_width_m": 7.0,
        "evacuation_door_width_m": 0.95,
    }
    results = engine.run_all_checks(building)
    summary = engine.summary(results)

    print(f"\n📊 To'liq tekshiruv natijasi:")
    print(f"   Jami: {summary['total_checks']} ta")
    print(f"   O'tdi: {summary['passed']} ta")
    print(f"   Rad etildi: {summary['failed']} ta")
    print(f"   Ekspertizaga tayyor: {summary['ekspertiza_ready']}")

    assert summary["failed"] == 0, f"Kutilmagan muvaffaqiyatsizliklar: {summary}"
    assert summary["ekspertiza_ready"] is True


def test_full_building_check_failing():
    """Xato bino — bir qancha qoidalar buzilgan bo'lishi kerak"""
    building = {
        "type": "residential",
        "construction_type": "new",
        "ceiling_height_m": 2.4,      # XATO: < 2.7m
        "apartments": 60,
        "parking_spots": 30,          # XATO: 0.5 < 1.0
        "ramp_rise_m": 1.0,
        "ramp_run_m": 6.0,            # XATO: 16.7% > 8.33%
        "ramp_width_m": 0.7,          # XATO: < 1.0m
        "fire_access_road_width_m": 4.5,  # XATO: < 6m
        "evacuation_door_width_m": 0.75,  # XATO: < 0.9m
    }
    results = engine.run_all_checks(building)
    summary = engine.summary(results)

    print(f"\n🚫 Xato bino natijasi:")
    for r in results:
        emoji = "✅" if r.status.value == "pass" else "🔴"
        print(f"   {emoji} {r.rule_id}: {r.message_uz}")

    assert summary["failed"] >= 5, f"Kamida 5 ta xato kutilgan edi, {summary['failed']} topildi"
    assert summary["ekspertiza_ready"] is False
    print(f"\n✅ Barcha {summary['failed']} ta xato to'g'ri aniqlandi")


def test_extended_50_plus_rules():
    """50+ ta yangi QMQ/ShNQ qoidalari dinamik tekshiruvdan o'tishi kerak"""
    building = {
        "ceiling_height_m": 2.8,
        "living_room_area_sqm": 18.5,
        "bedroom_area_sqm": 12.0,
        "kitchen_area_sqm": 9.5,
        "wheelchair_turning_diameter_m": 1.6,
        "accessible_toilet_width_m": 1.75,
        "antiseismic_joint_width_mm": 60.0,
        "column_min_dimension_mm": 450.0,
        "raft_slab_thickness_mm": 700.0,
        "greenery_area_percent": 30.0,
        "setback_from_major_street_redline_m": 7.0,
    }
    results = engine.run_all_checks(building)
    assert len(results) >= 11, f"Kutilgan tekshiruvlar kam: {len(results)}"
    for r in results:
        assert r.status == CheckStatus.PASS, f"Kutilmagan xato: {r.rule_id} -> {r.message_uz}"


if __name__ == "__main__":
    print("=" * 60)
    print("Me'morAI QMQ/ShNQ Qoidalar Dvigateli Testlari")
    print("=" * 60)

    tests = [
        test_ramp_slope_pass,
        test_ramp_slope_fail_steep,
        test_ramp_slope_borderline,
        test_ramp_width_pass,
        test_ramp_width_fail,
        test_parking_ratio_pass,
        test_parking_ratio_fail,
        test_parking_ratio_exact,
        test_ceiling_height_new_pass,
        test_ceiling_height_new_fail,
        test_ceiling_height_reconstruction_pass,
        test_evacuation_door_public_pass,
        test_evacuation_door_public_fail,
        test_evacuation_door_apartment_pass,
        test_fire_road_pass,
        test_fire_road_fail,
        test_seismic_tashkent,
        test_seismic_bukhara,
        test_full_building_check_passing,
        test_full_building_check_failing,
        test_extended_50_plus_rules,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"❌ {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"💥 {test.__name__}: {type(e).__name__}: {e}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"Natija: {passed} ta o'tdi / {failed} ta muvaffaqiyatsiz")
    print("=" * 60)
    sys.exit(0 if failed == 0 else 1)
