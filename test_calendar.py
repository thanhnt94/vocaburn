import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.core.db import SessionLocal
from app.modules.deck.routes.play import get_deck_roadmap_calendar
from fastapi import Request

async def main():
    async with SessionLocal() as db:
        class DummyRequest:
            cookies = {"user_id": "1"}
        req = DummyRequest()
        res = await get_deck_roadmap_calendar(req, 1, "2026-08", db)
        print(res)

asyncio.run(main())
