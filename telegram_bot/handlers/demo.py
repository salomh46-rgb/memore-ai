"""
Me'morAI Demo Bot - Demo Tekshiruv Handleri va QMQRulesEngine Integratsiyasi
"""
import sys
from pathlib import Path
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext

import config
from db import get_user_language, has_used_demo, mark_demo_used
from keyboards import get_demo_checks_keyboard, get_cta_keyboard, get_cancel_keyboard
from states import RampSlopeStates, CeilingHeightStates, ParkingRatioStates, FireRoadStates
from texts import get_texts

# QMQRulesEngine ni yuklash
sys.path.insert(0, str(config.RULES_DIR))
try:
    from rules_engine import QMQRulesEngine, CheckStatus
    rules_engine = QMQRulesEngine()
except Exception as e:
    rules_engine = None
    print(f"⚠️ QMQRulesEngine yuklashda xatolik: {e}")

router = Router()


def parse_float(text: str) -> float | None:
    """Foydalanuvchi kiritgan matnni float ga aylantirish (vergulni nuqtaga almashtiradi)."""
    try:
        clean = text.strip().replace(",", ".").replace("m", "").replace("м", "").replace("%", "")
        val = float(clean)
        return val if val > 0 else None
    except (ValueError, AttributeError):
        return None


def parse_int(text: str) -> int | None:
    """Foydalanuvchi kiritgan matnni int ga aylantirish."""
    try:
        clean = text.strip()
        val = int(clean)
        return val if val > 0 else None
    except (ValueError, AttributeError):
        return None


def format_check_output(
    is_passed: bool,
    title: str,
    code_clause: str,
    actual_str: str,
    required_str: str,
    lang: str = "uz"
) -> str:
    """Topshiriq talabidagi standart Markdown formatini shakllantirish."""
    if lang == "ru":
        status_header = "✅ СООТВЕТСТВУЕТ" if is_passed else "🔴 НЕ СООТВЕТСТВУЕТ"
        label_check = "Проверка"
        label_clause = "Статья"
        label_actual = "Вы ввели"
        label_norm = "Норма"
        note = (
            "Полностью соответствует требованиям госэкспертизы."
            if is_passed else
            "Приведет к отклонению проекта на госэкспертизе."
        )
    else:
        status_header = "✅ MUVOFIQ" if is_passed else "🔴 MUVAFFAQIYATSIZ"
        label_check = "Tekshiruv"
        label_clause = "Modda"
        label_actual = "Siz kiritgan"
        label_norm = "Me'yor"
        note = (
            "Davlat ekspertizasi talablariga to'liq javob beradi."
            if is_passed else
            "Ekspertiza rad etilishiga olib keladi."
        )

    msg = (
        f"{status_header}\n"
        f"**{label_check}:** {title}\n"
        f"**{label_clause}:** {code_clause}\n"
        f"**{label_actual}:** {actual_str}\n"
        f"**{label_norm}:** {required_str}\n"
        f"{note}"
    )
    return msg


async def check_demo_limit(callback: CallbackQuery, lang: str) -> bool:
    """Foydalanuvchi bepul demodan foydalanganligini tekshirish."""
    user_id = callback.from_user.id
    already_used = await has_used_demo(config.DATABASE_PATH, user_id)
    if already_used:
        t = get_texts(lang)
        await callback.message.answer(
            text=f"{t.DEMO_LIMIT_REACHED}\n\n{t.CTA_MESSAGE}",
            reply_markup=get_cta_keyboard(lang, config.PRO_PLATFORM_URL, config.CONTACT_URL),
            parse_mode="Markdown"
        )
        await callback.answer()
        return True
    return False


# ──────────────────────────────────────────────────────────
# 1. PANDUS QIYALIGI TEKSHIRUVI
# ──────────────────────────────────────────────────────────

@router.callback_query(F.data == "check:ramp_slope")
async def start_ramp_check(callback: CallbackQuery, state: FSMContext):
    """Pandus tekshiruvini boshlash."""
    await state.clear()
    lang = await get_user_language(config.DATABASE_PATH, callback.from_user.id)
    if await check_demo_limit(callback, lang):
        return

    t = get_texts(lang)
    await state.set_state(RampSlopeStates.waiting_for_rise)
    await callback.message.answer(
        text=t.PROMPT_RAMP_RISE,
        reply_markup=get_cancel_keyboard(lang),
        parse_mode="Markdown"
    )
    await callback.answer()


@router.message(RampSlopeStates.waiting_for_rise)
async def process_ramp_rise(message: Message, state: FSMContext):
    """Pandus ko'tarilish balandligini qabul qilish."""
    lang = await get_user_language(config.DATABASE_PATH, message.from_user.id)
    t = get_texts(lang)
    rise_m = parse_float(message.text)

    if rise_m is None:
        await message.answer(
            text=t.ERR_INVALID_NUMBER,
            reply_markup=get_cancel_keyboard(lang),
            parse_mode="Markdown"
        )
        return

    await state.update_data(rise_m=rise_m)
    await state.set_state(RampSlopeStates.waiting_for_run)
    await message.answer(
        text=t.PROMPT_RAMP_RUN,
        reply_markup=get_cancel_keyboard(lang),
        parse_mode="Markdown"
    )


@router.message(RampSlopeStates.waiting_for_run)
async def process_ramp_run(message: Message, state: FSMContext):
    """Pandus gorizontal uzunligini qabul qilish va natijani chiqarish."""
    lang = await get_user_language(config.DATABASE_PATH, message.from_user.id)
    t = get_texts(lang)
    run_m = parse_float(message.text)

    if run_m is None:
        await message.answer(
            text=t.ERR_INVALID_NUMBER,
            reply_markup=get_cancel_keyboard(lang),
            parse_mode="Markdown"
        )
        return

    data = await state.get_data()
    rise_m = data.get("rise_m", 0.0)
    await state.clear()

    # QMQRulesEngine tekshiruvi
    result = rules_engine.check_ramp_slope(rise_m=rise_m, run_m=run_m)
    is_passed = (result.status == CheckStatus.PASS)

    slope_percent = round((rise_m / run_m) * 100, 2)
    output_text = format_check_output(
        is_passed=is_passed,
        title="Pandus qiyaligi" if lang == "uz" else "Уклон пандуса",
        code_clause=f"{result.code}, {result.clause}",
        actual_str=f"{slope_percent}% (h={rise_m}m, l={run_m}m)",
        required_str="<= 8.33%",
        lang=lang
    )

    # Bazada 1 ta bepul demo ishlatildi deb belgilash
    await mark_demo_used(
        config.DATABASE_PATH,
        user_id=message.from_user.id,
        check_type="ramp_slope",
        input_values=f"rise={rise_m}m, run={run_m}m",
        result_status=result.status.value
    )

    await message.answer(text=output_text, parse_mode="Markdown")
    await message.answer(
        text=t.CTA_MESSAGE,
        reply_markup=get_cta_keyboard(lang, config.PRO_PLATFORM_URL, config.CONTACT_URL),
        parse_mode="Markdown"
    )


# ──────────────────────────────────────────────────────────
# 2. SHIFT BALANDLIGI TEKSHIRUVI
# ──────────────────────────────────────────────────────────

@router.callback_query(F.data == "check:ceiling_height")
async def start_ceiling_check(callback: CallbackQuery, state: FSMContext):
    """Shift balandligi tekshiruvini boshlash."""
    await state.clear()
    lang = await get_user_language(config.DATABASE_PATH, callback.from_user.id)
    if await check_demo_limit(callback, lang):
        return

    t = get_texts(lang)
    await state.set_state(CeilingHeightStates.waiting_for_height)
    await callback.message.answer(
        text=t.PROMPT_CEILING_HEIGHT,
        reply_markup=get_cancel_keyboard(lang),
        parse_mode="Markdown"
    )
    await callback.answer()


@router.message(CeilingHeightStates.waiting_for_height)
async def process_ceiling_height(message: Message, state: FSMContext):
    """Shift balandligini qabul qilish va natijani chiqarish."""
    lang = await get_user_language(config.DATABASE_PATH, message.from_user.id)
    t = get_texts(lang)
    height_m = parse_float(message.text)

    if height_m is None:
        await message.answer(
            text=t.ERR_INVALID_NUMBER,
            reply_markup=get_cancel_keyboard(lang),
            parse_mode="Markdown"
        )
        return

    await state.clear()

    # QMQRulesEngine tekshiruvi
    result = rules_engine.check_ceiling_height(actual_height_m=height_m, construction_type="new")
    is_passed = (result.status == CheckStatus.PASS)

    output_text = format_check_output(
        is_passed=is_passed,
        title="Shift balandligi" if lang == "uz" else "Высота потолка",
        code_clause=f"{result.code}, {result.clause}",
        actual_str=f"{height_m:.2f}m",
        required_str=">= 2.70m",
        lang=lang
    )

    # Bazada 1 ta bepul demo ishlatildi deb belgilash
    await mark_demo_used(
        config.DATABASE_PATH,
        user_id=message.from_user.id,
        check_type="ceiling_height",
        input_values=f"height={height_m}m",
        result_status=result.status.value
    )

    await message.answer(text=output_text, parse_mode="Markdown")
    await message.answer(
        text=t.CTA_MESSAGE,
        reply_markup=get_cta_keyboard(lang, config.PRO_PLATFORM_URL, config.CONTACT_URL),
        parse_mode="Markdown"
    )


# ──────────────────────────────────────────────────────────
# 3. AVTOTURARGOH KOEFFITSIENTI TEKSHIRUVI
# ──────────────────────────────────────────────────────────

@router.callback_query(F.data == "check:parking_ratio")
async def start_parking_check(callback: CallbackQuery, state: FSMContext):
    """Avtoturargoh tekshiruvini boshlash."""
    await state.clear()
    lang = await get_user_language(config.DATABASE_PATH, callback.from_user.id)
    if await check_demo_limit(callback, lang):
        return

    t = get_texts(lang)
    await state.set_state(ParkingRatioStates.waiting_for_spots)
    await callback.message.answer(
        text=t.PROMPT_PARKING_SPOTS,
        reply_markup=get_cancel_keyboard(lang),
        parse_mode="Markdown"
    )
    await callback.answer()


@router.message(ParkingRatioStates.waiting_for_spots)
async def process_parking_spots(message: Message, state: FSMContext):
    """Avtoturargoh o'rinlari sonini qabul qilish."""
    lang = await get_user_language(config.DATABASE_PATH, message.from_user.id)
    t = get_texts(lang)
    spots = parse_int(message.text)

    if spots is None:
        await message.answer(
            text=t.ERR_INVALID_INT,
            reply_markup=get_cancel_keyboard(lang),
            parse_mode="Markdown"
        )
        return

    await state.update_data(spots=spots)
    await state.set_state(ParkingRatioStates.waiting_for_apartments)
    await message.answer(
        text=t.PROMPT_PARKING_APARTMENTS,
        reply_markup=get_cancel_keyboard(lang),
        parse_mode="Markdown"
    )


@router.message(ParkingRatioStates.waiting_for_apartments)
async def process_parking_apartments(message: Message, state: FSMContext):
    """Xonadonlar sonini qabul qilish va natijani chiqarish."""
    lang = await get_user_language(config.DATABASE_PATH, message.from_user.id)
    t = get_texts(lang)
    apartments = parse_int(message.text)

    if apartments is None:
        await message.answer(
            text=t.ERR_INVALID_INT,
            reply_markup=get_cancel_keyboard(lang),
            parse_mode="Markdown"
        )
        return

    data = await state.get_data()
    spots = data.get("spots", 0)
    await state.clear()

    # QMQRulesEngine tekshiruvi
    result = rules_engine.check_parking_ratio(total_parking_spots=spots, total_apartments=apartments)
    is_passed = (result.status == CheckStatus.PASS)

    ratio = round(spots / apartments, 2)
    output_text = format_check_output(
        is_passed=is_passed,
        title="Avtoturargoh koeffitsienti" if lang == "uz" else "Коэффициент парковочных мест",
        code_clause=f"{result.code}, {result.clause}",
        actual_str=f"{ratio} ({spots} o'rin / {apartments} xonadon)",
        required_str=f">= {result.required_value} (1 xonadonga kamida 0.8)",
        lang=lang
    )

    # Bazada 1 ta bepul demo ishlatildi deb belgilash
    await mark_demo_used(
        config.DATABASE_PATH,
        user_id=message.from_user.id,
        check_type="parking_ratio",
        input_values=f"spots={spots}, apartments={apartments}",
        result_status=result.status.value
    )

    await message.answer(text=output_text, parse_mode="Markdown")
    await message.answer(
        text=t.CTA_MESSAGE,
        reply_markup=get_cta_keyboard(lang, config.PRO_PLATFORM_URL, config.CONTACT_URL),
        parse_mode="Markdown"
    )


# ──────────────────────────────────────────────────────────
# 4. YONG'IN YO'LI KENGILIGI TEKSHIRUVI
# ──────────────────────────────────────────────────────────

@router.callback_query(F.data == "check:fire_road")
async def start_fire_road_check(callback: CallbackQuery, state: FSMContext):
    """Yong'in yo'li tekshiruvini boshlash."""
    await state.clear()
    lang = await get_user_language(config.DATABASE_PATH, callback.from_user.id)
    if await check_demo_limit(callback, lang):
        return

    t = get_texts(lang)
    await state.set_state(FireRoadStates.waiting_for_width)
    await callback.message.answer(
        text=t.PROMPT_FIRE_ROAD,
        reply_markup=get_cancel_keyboard(lang),
        parse_mode="Markdown"
    )
    await callback.answer()


@router.message(FireRoadStates.waiting_for_width)
async def process_fire_road_width(message: Message, state: FSMContext):
    """Yong'in yo'li kengligini qabul qilish va natijani chiqarish."""
    lang = await get_user_language(config.DATABASE_PATH, message.from_user.id)
    t = get_texts(lang)
    width_m = parse_float(message.text)

    if width_m is None:
        await message.answer(
            text=t.ERR_INVALID_NUMBER,
            reply_markup=get_cancel_keyboard(lang),
            parse_mode="Markdown"
        )
        return

    await state.clear()

    # QMQRulesEngine tekshiruvi
    result = rules_engine.check_fire_access_road_width(actual_width_m=width_m)
    is_passed = (result.status == CheckStatus.PASS)

    output_text = format_check_output(
        is_passed=is_passed,
        title="Yong'in yo'li kengligi" if lang == "uz" else "Ширина пожарного проезда",
        code_clause=f"{result.code}, {result.clause}",
        actual_str=f"{width_m:.2f}m",
        required_str=f">= {result.required_value:.1f}m",
        lang=lang
    )

    # Bazada 1 ta bepul demo ishlatildi deb belgilash
    await mark_demo_used(
        config.DATABASE_PATH,
        user_id=message.from_user.id,
        check_type="fire_road",
        input_values=f"width={width_m}m",
        result_status=result.status.value
    )

    await message.answer(text=output_text, parse_mode="Markdown")
    await message.answer(
        text=t.CTA_MESSAGE,
        reply_markup=get_cta_keyboard(lang, config.PRO_PLATFORM_URL, config.CONTACT_URL),
        parse_mode="Markdown"
    )
