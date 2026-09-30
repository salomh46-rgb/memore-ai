"""
Me'morAI Demo Bot - CTA va Qayta Ishga Tushirish Handleri
"""
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext

import config
from db import get_user_language, has_used_demo
from keyboards import get_demo_checks_keyboard, get_cta_keyboard
from texts import get_texts

router = Router()


@router.callback_query(F.data == "menu_restart")
async def handle_menu_restart(callback: CallbackQuery, state: FSMContext):
    """Bosh menyuga qaytish yoki demo limitini ko'rsatish."""
    await state.clear()
    user_id = callback.from_user.id
    lang = await get_user_language(config.DATABASE_PATH, user_id)
    t = get_texts(lang)

    used = await has_used_demo(config.DATABASE_PATH, user_id)
    if used:
        await callback.message.answer(
            text=f"{t.DEMO_LIMIT_REACHED}\n\n{t.CTA_MESSAGE}",
            reply_markup=get_cta_keyboard(lang, config.PRO_PLATFORM_URL, config.CONTACT_URL),
            parse_mode="Markdown"
        )
    else:
        await callback.message.answer(
            text=f"{t.START_MESSAGE}\n\n{t.MAIN_MENU_TITLE}",
            reply_markup=get_demo_checks_keyboard(lang),
            parse_mode="Markdown"
        )
    await callback.answer()


@router.message(Command("demo"))
async def handle_demo_command(message: Message, state: FSMContext):
    """/demo buyrug'i orqali tekshiruvlarni boshlash."""
    await state.clear()
    user_id = message.from_user.id
    lang = await get_user_language(config.DATABASE_PATH, user_id)
    t = get_texts(lang)

    used = await has_used_demo(config.DATABASE_PATH, user_id)
    if used:
        await message.answer(
            text=f"{t.DEMO_LIMIT_REACHED}\n\n{t.CTA_MESSAGE}",
            reply_markup=get_cta_keyboard(lang, config.PRO_PLATFORM_URL, config.CONTACT_URL),
            parse_mode="Markdown"
        )
    else:
        await message.answer(
            text=f"{t.START_MESSAGE}\n\n{t.MAIN_MENU_TITLE}",
            reply_markup=get_demo_checks_keyboard(lang),
            parse_mode="Markdown"
        )


@router.message(Command("pro"))
async def handle_pro_command(message: Message):
    """/pro buyrug'i orqali Pro versiya ma'lumotlarini olish."""
    lang = await get_user_language(config.DATABASE_PATH, message.from_user.id)
    t = get_texts(lang)
    await message.answer(
        text=t.CTA_MESSAGE,
        reply_markup=get_cta_keyboard(lang, config.PRO_PLATFORM_URL, config.CONTACT_URL),
        parse_mode="Markdown"
    )
