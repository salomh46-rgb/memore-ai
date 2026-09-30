"""
Me'morAI Demo Bot - Avtomatlashtirilgan Integratsiya va Mantiq Testlari
"""
import asyncio
import os
import sys
import tempfile
from pathlib import Path

# Yo'llarni to'g'irlash
BOT_DIR = Path(__file__).parent.resolve()
PARENT_DIR = BOT_DIR.parent.resolve()
RULES_PATH = PARENT_DIR / "rules"

sys.path.insert(0, str(BOT_DIR))
sys.path.insert(0, str(RULES_PATH))

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

from db.sqlite import (
    init_db,
    get_or_create_user,
    get_user,
    get_user_language,
    set_user_language,
    has_used_demo,
    mark_demo_used,
)
from rules_engine import QMQRulesEngine, CheckStatus
from handlers.demo import parse_float, parse_int, format_check_output


async def run_tests():
    print("🚀 Me'morAI Demo Bot testlari boshlanmoqda...")

    # 1. QMQRulesEngine import va tekshiruvlari
    print("1. QMQRulesEngine tekshiruvi...")
    engine = QMQRulesEngine()

    # Pandus tekshiruvi (rise=0.5, run=8.0 -> slope=6.25% -> PASS)
    ramp_res = engine.check_ramp_slope(0.5, 8.0)
    assert ramp_res.status == CheckStatus.PASS, f"Kutilgan: PASS, Olingan: {ramp_res.status}"
    print("   ✅ Pandus PASS testi muvaffaqiyatli")

    # Pandus tekshiruvi (rise=1.0, run=6.0 -> slope=16.67% -> FAIL)
    ramp_fail = engine.check_ramp_slope(1.0, 6.0)
    assert ramp_fail.status == CheckStatus.FAIL, f"Kutilgan: FAIL, Olingan: {ramp_fail.status}"
    print("   ✅ Pandus FAIL testi muvaffaqiyatli")

    # Shift balandligi (2.8m -> PASS)
    ceil_res = engine.check_ceiling_height(2.8)
    assert ceil_res.status == CheckStatus.PASS
    print("   ✅ Shift balandligi PASS testi muvaffaqiyatli")

    # Shift balandligi (2.5m -> FAIL yangi qurilish uchun)
    ceil_fail = engine.check_ceiling_height(2.5, construction_type="new")
    assert ceil_fail.status == CheckStatus.FAIL
    print("   ✅ Shift balandligi FAIL testi muvaffaqiyatli")

    # Avtoturargoh (spots=50, apt=50 -> 1.0 -> PASS >= 0.8)
    park_res = engine.check_parking_ratio(50, 50)
    assert park_res.status == CheckStatus.PASS
    print("   ✅ Avtoturargoh PASS testi muvaffaqiyatli")

    # Yong'in yo'li (width=6.0m -> PASS >= 6.0)
    fire_res = engine.check_fire_access_road_width(6.0)
    assert fire_res.status == CheckStatus.PASS
    print("   ✅ Yong'in yo'li PASS testi muvaffaqiyatli")

    # 2. Input Parserlar tekshiruvi
    print("2. Input Parserlar tekshiruvi...")
    assert parse_float("2.8") == 2.8
    assert parse_float("2,8") == 2.8
    assert parse_float("6.0m") == 6.0
    assert parse_float("15.5%") == 15.5
    assert parse_float("-1.5") is None
    assert parse_float("abc") is None
    assert parse_int("50") == 50
    assert parse_int("-5") is None
    assert parse_int("xyz") is None
    print("   ✅ Input parserlar to'g'ri ishladi")

    # 3. Formatlash testi
    print("3. Natija matni formatlash testi...")
    output_uz = format_check_output(
        is_passed=False,
        title="Pandus qiyaligi",
        code_clause="ShNQ 2.07.02-22, §17",
        actual_str="15.0%",
        required_str="<= 8.33%",
        lang="uz"
    )
    assert "🔴 MUVAFFAQIYATSIZ" in output_uz
    assert "Ekspertiza rad etilishiga olib keladi." in output_uz
    assert "ShNQ 2.07.02-22, §17" in output_uz
    print("   ✅ Formatlash formati 100% to'g'ri")

    # 4. Database va 1 ta BEPUL DEMO qoidasi
    print("4. SQLite va Demo Limit tekshiruvi...")
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        test_db_path = tmp_db.name

    try:
        await init_db(test_db_path)
        user_id = 999888777

        # Yangi foydalanuvchi
        user = await get_or_create_user(test_db_path, user_id=user_id, username="testuser", full_name="Test User", language="uz")
        assert user["user_id"] == user_id
        assert user["demo_used"] == 0

        # Demo ishlatganmi? Hozircha yo'q!
        assert await has_used_demo(test_db_path, user_id) is False
        print("   ✅ Yangi foydalanuvchida demo_used = 0")

        # Tilni o'zgartirish
        await set_user_language(test_db_path, user_id, "ru")
        assert await get_user_language(test_db_path, user_id) == "ru"
        print("   ✅ Til o'zgartirish ishladi (ru)")

        # 1 ta tekshiruv qildi va demo_used belgilandi
        await mark_demo_used(
            test_db_path,
            user_id=user_id,
            check_type="ramp_slope",
            input_values="rise=0.5m, run=6.0m",
            result_status="pass"
        )

        # Endi demo_used True bo'lishi shart!
        assert await has_used_demo(test_db_path, user_id) is True
        print("   ✅ Demo tekshiruvdan keyin has_used_demo == True")

    finally:
        if os.path.exists(test_db_path):
            os.remove(test_db_path)

    print("\n🎉 BARCHA INTEGRATSIYA TESTLARI 100% MUVAFFAQIYATLI O'TDI!")


if __name__ == "__main__":
    asyncio.run(run_tests())
