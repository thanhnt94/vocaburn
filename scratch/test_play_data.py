import asyncio
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from app.modules.auth.models import User
from app.modules.deck.routes.play import get_deck_play_data

class MockRequest:
    def __init__(self):
        self.scope = {}
        self.cookies = {"user_id": "1"}
        self.headers = {}

async def main():
    async with SessionLocal() as db:
        req = MockRequest()
        
        # Test performance and correctness for deck 1
        t0 = time.perf_counter()
        res = await get_deck_play_data(req, deck_id=1, mode=None, db=db)
        t1 = time.perf_counter()
        
        print(f"Loaded play data in {(t1 - t0) * 1000:.2f} ms")
        print("Total cards returned:", len(res.get("cards", [])))
        
        # Look at the first card's FSRS structure
        if res.get("cards"):
            first = res["cards"][0]
            print("\nFirst Card Details:")
            print("  ID:", first.get("id"))
            print("  Content:", first.get("content").encode('ascii', errors='backslashreplace').decode('ascii'))
            print("  FSRS:", first.get("fsrs"))
            
        new_cards = [c for c in res.get("cards", []) if c.get("fsrs") and c["fsrs"]["state"] == 0]
        print("\nTotal new cards:", len(new_cards))
        if new_cards:
            print("First new card details:")
            print("  ID:", new_cards[0].get("id"))
            print("  FSRS:", new_cards[0].get("fsrs"))

if __name__ == '__main__':
    asyncio.run(main())
