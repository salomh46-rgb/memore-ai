"""
Me'morAI Telegram Demo Bot - Konfiguratsiya
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# .env faylini bot papkasidan yoki loyiha ildizidan yuklash
BASE_DIR = Path(__file__).parent.resolve()
ROOT_DIR = BASE_DIR.parent.resolve()

load_dotenv(BASE_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")

BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
DATABASE_PATH: Path = BASE_DIR / os.getenv("DATABASE_PATH", "memore_demo_bot.db")
PRO_PLATFORM_URL: str = os.getenv("PRO_PLATFORM_URL", "https://memore-ai.uz")
CONTACT_URL: str = os.getenv("CONTACT_URL", "https://t.me/asqarov_j")

# QMQ Rules Engine papkasi
RULES_DIR = ROOT_DIR / "rules"
