"""Создаёт админа из ADMIN_EMAIL/ADMIN_PASSWORD при первом запуске.

Идемпотентен — если админ уже существует, не делает ничего.
Модели ИИ и их цены создаёт миграция 0011, менять их — в админке.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from config import settings  # noqa: E402
from database import AsyncSessionLocal  # noqa: E402
from modules.auth.models import User, UserProfile, UserRole  # noqa: E402
from modules.auth.utils import hash_password  # noqa: E402


async def main() -> None:
    async with AsyncSessionLocal() as db:
        admin = await db.scalar(
            select(User).where(User.email == settings.admin_email)
        )
        if admin:
            print(f"[create_admin] Admin {settings.admin_email} already exists")
            return

        admin = User(
            email=settings.admin_email,
            hashed_password=hash_password(settings.admin_password),
            role=UserRole.ADMIN,
            is_active=True,
            is_email_verified=True,
        )
        db.add(admin)
        await db.flush()
        db.add(UserProfile(user_id=admin.id, first_name="Admin"))
        await db.commit()
        print(f"[create_admin] Admin {settings.admin_email} created")


if __name__ == "__main__":
    asyncio.run(main())
