import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.services.deck_service import DeckService

async def main():
    async with SessionLocal() as db:
        user_id = 1
        res = await DeckService.get_today_review(db, user_id)
        print("Result of get_today_review for user 1:")
        import json
        print(json.dumps(res, ensure_ascii=True, indent=2))

if __name__ == '__main__':
    asyncio.run(main())
