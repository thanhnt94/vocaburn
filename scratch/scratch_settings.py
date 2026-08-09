import asyncio
from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.models import UserDeckSettings
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        user_res = await db.execute(select(User).where(User.username == 'thanhnt'))
        user = user_res.scalar_one_or_none()
        if not user:
            print("User not found")
            return
        sett_res = await db.execute(select(UserDeckSettings).where(UserDeckSettings.user_id == user.id, UserDeckSettings.deck_id == 1))
        sett = sett_res.scalar_one_or_none()
        if sett:
            print("SETTINGS:", sett.settings)
        else:
            print("Settings not found")

if __name__ == "__main__":
    asyncio.run(main())
