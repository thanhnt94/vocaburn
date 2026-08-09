import asyncio
from app.core.db import SessionLocal
from app.modules.auth.models import User

async def main():
    async with SessionLocal() as db:
        users_res = await db.execute(select(User))
        for u in users_res.scalars().all():
            print(u.id, u.username)

if __name__ == "__main__":
    from sqlalchemy import select
    asyncio.run(main())
