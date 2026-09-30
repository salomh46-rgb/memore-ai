"""
Me'morAI Demo Bot - Asinxron SQLite Database Moduli (aiosqlite)
"""
import aiosqlite
from pathlib import Path
from typing import Optional, Dict, Any


async def init_db(db_path: Path | str) -> None:
    """Ma'lumotlar bazasi jadvallarini yaratish va initsializatsiya qilish."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                full_name TEXT,
                language TEXT DEFAULT 'uz',
                demo_used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS demo_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                check_type TEXT NOT NULL,
                input_values TEXT,
                result_status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        """)
        await db.commit()


async def get_or_create_user(
    db_path: Path | str,
    user_id: int,
    username: Optional[str] = None,
    full_name: Optional[str] = None,
    language: str = "uz"
) -> Dict[str, Any]:
    """Foydalanuvchini olish yoki yangi foydalanuvchi yaratish."""
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                # Faollik vaqtini yangilash
                await db.execute(
                    "UPDATE users SET last_active_at = CURRENT_TIMESTAMP, username = ?, full_name = ? WHERE user_id = ?",
                    (username, full_name, user_id)
                )
                await db.commit()
                return dict(row)

        # Yangi foydalanuvchi qo'shish
        await db.execute(
            """
            INSERT INTO users (user_id, username, full_name, language, demo_used)
            VALUES (?, ?, ?, ?, 0)
            """,
            (user_id, username, full_name, language)
        )
        await db.commit()

        async with db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else {}


async def get_user(db_path: Path | str, user_id: int) -> Optional[Dict[str, Any]]:
    """Foydalanuvchi ma'lumotlarini olish."""
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def get_user_language(db_path: Path | str, user_id: int) -> str:
    """Foydalanuvchi tilini aniqlash (default: 'uz')."""
    user = await get_user(db_path, user_id)
    if user and user.get("language"):
        return user["language"]
    return "uz"


async def set_user_language(db_path: Path | str, user_id: int, language: str) -> None:
    """Foydalanuvchi tilini yangilash ('uz' yoki 'ru')."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            "UPDATE users SET language = ?, last_active_at = CURRENT_TIMESTAMP WHERE user_id = ?",
            (language, user_id)
        )
        await db.commit()


async def has_used_demo(db_path: Path | str, user_id: int) -> bool:
    """Foydalanuvchi bepul demo tekshiruvidan foydalanganmi tekshirish."""
    user = await get_user(db_path, user_id)
    if not user:
        return False
    return bool(user.get("demo_used", 0))


async def mark_demo_used(
    db_path: Path | str,
    user_id: int,
    check_type: str,
    input_values: str = "",
    result_status: str = ""
) -> None:
    """Foydalanuvchini demo tekshiruvidan foydalangan deb belgilash va log saqlash."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            "UPDATE users SET demo_used = 1, last_active_at = CURRENT_TIMESTAMP WHERE user_id = ?",
            (user_id,)
        )
        await db.execute(
            """
            INSERT INTO demo_checks (user_id, check_type, input_values, result_status)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, check_type, input_values, result_status)
        )
        await db.commit()
