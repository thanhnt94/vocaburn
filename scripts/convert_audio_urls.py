import asyncio
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Import all models to populate SQLAlchemy mapper registry
from app.modules.auth.models import User
from app.modules.deck.models import (
    Category, FlashcardDeck, Flashcard, DeckAttempt, UserAnswer, DeckSession,
    UserCardNote, Tag, DeckTag, DeckRoom, DeckRoomParticipant,
    DeckRoomChat, DeckCollaborator, UserDeckGoal, UserDailyProgress,
    UserCardMastery, UserDeckSettings
)

from app.core.db import SessionLocal
from sqlalchemy.future import select

async def main():
    async with SessionLocal() as db:
        result = await db.execute(select(Flashcard))
        cards = result.scalars().all()
        updated_count = 0
        
        for c in cards:
            changed = False
            # Clean up c.audio (front audio URL)
            if c.audio and ("/static/uploads/" in c.audio) and c.audio.startswith("http"):
                match = re.search(r"(/static/uploads/.*)$", c.audio)
                if match:
                    old = c.audio
                    c.audio = match.group(1)
                    print(f"Card #{c.id} front audio: {old} -> {c.audio}")
                    changed = True
            
            # Clean up c.others for back_audio_url
            if c.others and isinstance(c.others, dict):
                back_audio = c.others.get("back_audio_url")
                if back_audio and ("/static/uploads/" in back_audio) and back_audio.startswith("http"):
                    match = re.search(r"(/static/uploads/.*)$", back_audio)
                    if match:
                        old = back_audio
                        c.others["back_audio_url"] = match.group(1)
                        print(f"Card #{c.id} back audio: {old} -> {c.others['back_audio_url']}")
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(c, "others")
                        changed = True
            
            if changed:
                updated_count += 1
                
        if updated_count > 0:
            await db.commit()
            print(f"Successfully converted {updated_count} cards' audio URLs to relative paths.")
        else:
            print("No absolute audio URLs found to convert.")

if __name__ == '__main__':
    asyncio.run(main())
