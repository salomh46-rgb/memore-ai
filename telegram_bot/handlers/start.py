"""
Me'morAI Demo Bot - Start va Til Boshqaruvi Handleri
"""
from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext

import config
from db import get_or_create_user, get_user_language, set_user_language
from keyboards import get_language_keyboard, get_demo_checks_keyboard
from texts import get_texts, uz, ru

router = Router()


@router.message(CommandStart())
async def handle_start(message: Message, state: FSMContext):
    """
    /start buyrug'i. Foydalanuvchini ro'yxatdan o'tkazish va til tanlash/bosh menyuni ko'rsatish.
    """
    await state.clear()
    user_id = message.from_user.id
    username = message.from_user.username
    full_name = message.from_user.full_name

    # Bazadan foydalanuvchini olish yoki yaratish
    user = await get_or_create_user(
        db_path=config.DATABASE_PATH,
        user_id=user_id,
        username=username,
        full_name=full_name,
        language="uz"
    )

    # Agar birinchi marta kirgan bo'lsa, til tanlashni taklif qilamiz
    # Aks holda mavjud tilda bosh menyuni chiqaramiz
    lang = user.get("language")
    if not lang:
        await message.answer(
            text=uz.WELCOME_CHOOSE_LANG,
            reply_markup=get_language_keyboard(),
            parse_mode="Markdown"
        )
    else:
        t = get_texts(lang)
        await message.answer(
            text=f"{t.START_MESSAGE}\n\n{t.MAIN_MENU_TITLE}",
            reply_markup=get_demo_checks_keyboard(lang),
            parse_mode="Markdown"
        )


@router.callback_query(F.data.startswith("set_lang:"))
async def handle_set_language(callback: CallbackQuery, state: FSMContext):
    """Foydalanuvchi tanlagan tilni saqlash va bosh menyuga o'tish."""
    await state.clear()
    lang = callback.data.split(":")[1]
    if lang not in ("uz", "ru"):
        lang = "uz"

    user_id = callback.from_user.id
    await set_user_language(config.DATABASE_PATH, user_id, lang)

    t = get_texts(lang)
    try:
        await callback.message.edit_text(
            text=f"{t.START_MESSAGE}\n\n{t.MAIN_MENU_TITLE}",
            reply_markup=get_demo_checks_keyboard(lang),
            parse_mode="Markdown"
        )
    except Exception:
        await callback.message.answer(
            text=f"{t.START_MESSAGE}\n\n{t.MAIN_MENU_TITLE}",
            reply_markup=get_demo_checks_keyboard(lang),
            parse_mode="Markdown"
        )
    await callback.answer()


@router.callback_query(F.data == "change_lang")
async def handle_change_language(callback: CallbackQuery, state: FSMContext):
    """Tilni o'zgartirish oynasini ochish."""
    await state.clear()
    await callback.message.edit_text(
        text=uz.WELCOME_CHOOSE_LANG,
        reply_markup=get_language_keyboard(),
        parse_mode="Markdown"
    )
    await callback.answer()


@router.callback_query(F.data == "cancel_action")
async def handle_cancel_action(callback: CallbackQuery, state: FSMContext):
    """Har qanday jarayonni bekor qilish va bosh menyuga qaytish."""
    await state.clear()
    lang = await get_user_language(config.DATABASE_PATH, callback.from_user.id)
    t = get_texts(lang)

    await callback.message.answer(
        text=f"{t.ACTION_CANCELLED}\n\n{t.MAIN_MENU_TITLE}",
        reply_markup=get_demo_checks_keyboard(lang),
        parse_mode="Markdown"
    )
    await callback.answer()
