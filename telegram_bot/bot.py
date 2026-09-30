"""
Me'morAI Telegram Demo Bot - Asosiy Kirish Nuqtasi (Entrypoint)
"""
import asyncio
import logging
import sys
from pathlib import Path

# QMQ Rules Engine yo'lini Python sys.path ga qo'shish
PARENT_DIR = Path(__file__).parent.parent.resolve()
RULES_PATH = PARENT_DIR / "rules"
if str(RULES_PATH) not in sys.path:
    sys.path.insert(0, str(RULES_PATH))

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

import config
from db import init_db
from handlers import start_router, demo_router, cta_router

# Loggingni sozlash
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def main() -> None:
    """Botni ishga tushirish funksiyasi."""
    logger.info("🏛 Me'morAI Demo Bot ishga tushirilmoqda...")

    if not config.BOT_TOKEN or config.BOT_TOKEN.startswith("1234567890:"):
        logger.error(
            "❌ BOT_TOKEN topilmadi yoki .env faylida to'g'ri o'rnatilmagan! "
            "Iltimos, .env faylida haqiqiy BOT_TOKEN ni ko'rsating."
        )
        return

    # Ma'lumotlar bazasini initsializatsiya qilish
    logger.info(f"💾 SQLite ma'lumotlar bazasi initsializatsiya qilinmoqda: {config.DATABASE_PATH}")
    await init_db(config.DATABASE_PATH)

    # Bot va Dispatcher yaratish
    bot = Bot(token=config.BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())

    # Routerlarni ro'yxatdan o'tkazish
    dp.include_router(start_router)
    dp.include_router(demo_router)
    dp.include_router(cta_router)

    # Botni ishga tushirish (polling)
    try:
        logger.info("🚀 Bot muvaffaqiyatli ishga tushdi va xabarlarni kutmoqda...")
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    finally:
        await bot.session.close()
        logger.info("🛑 Bot to'xtatildi.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot jarayoni yakunlandi.")
