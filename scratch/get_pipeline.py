import asyncio
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from sqlalchemy import select
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.models import UserDeckSettings

async def main():
    async with SessionLocal() as db:
        user_id = 1
        sett = await db.scalar(select(UserDeckSettings).where(UserDeckSettings.user_id == user_id, UserDeckSettings.deck_id == 1))
        if sett:
            print(sett.settings)
        else:
            print("No settings found")

asyncio.run(main())
