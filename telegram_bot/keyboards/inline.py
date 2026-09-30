"""
Me'morAI Demo Bot - Inline Klavyaturalar
"""
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from texts import get_texts


def get_language_keyboard() -> InlineKeyboardMarkup:
    """Til tanlash klaviaturasi."""
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🇺🇿 O'zbekcha", callback_data="set_lang:uz"),
                InlineKeyboardButton(text="🇷🇺 Русский", callback_data="set_lang:ru"),
            ]
        ]
    )
    return keyboard


def get_demo_checks_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """4 ta demo tekshiruv turi va qo'shimcha tugmalar."""
    t = get_texts(lang)
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t.BTN_RAMP_SLOPE, callback_data="check:ramp_slope"),
            ],
            [
                InlineKeyboardButton(text=t.BTN_CEILING_HEIGHT, callback_data="check:ceiling_height"),
            ],
            [
                InlineKeyboardButton(text=t.BTN_PARKING_RATIO, callback_data="check:parking_ratio"),
            ],
            [
                InlineKeyboardButton(text=t.BTN_FIRE_ROAD, callback_data="check:fire_road"),
            ],
            [
                InlineKeyboardButton(text=t.BTN_CHANGE_LANG, callback_data="change_lang"),
            ]
        ]
    )
    return keyboard


def get_cta_keyboard(
    lang: str = "uz",
    pro_url: str = "https://memore-ai.uz",
    contact_url: str = "https://t.me/asqarov_j"
) -> InlineKeyboardMarkup:
    """Natijadan keyingi Pro versiya va bog'lanish tugmalari."""
    t = get_texts(lang)
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t.BTN_PRO_VERSION, url=pro_url),
            ],
            [
                InlineKeyboardButton(text=t.BTN_CONTACT, url=contact_url),
            ],
            [
                InlineKeyboardButton(
                    text="🔄 Bosh menyu" if lang == "uz" else "🔄 Главное меню",
                    callback_data="menu_restart"
                ),
            ]
        ]
    )
    return keyboard


def get_cancel_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Jarayonni bekor qilish tugmasi."""
    t = get_texts(lang)
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t.BTN_CANCEL, callback_data="cancel_action"),
            ]
        ]
    )
    return keyboard
