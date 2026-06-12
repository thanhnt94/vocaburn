import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.db import Base
from app.modules.auth.models import User
from app.modules.deck.models import UserAnswer, DeckAttempt
from sqlalchemy import select, func, extract
from datetime import datetime

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
async def test_hourly_average():
    # Setup in-memory sqlite database for testing
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        # Create mock user record
        user = User(id=1, username="testuser", email="test@example.com", hashed_password="pw")
        # Create mock deck attempt records
        attempt1 = DeckAttempt(id=1, user_id=1, deck_id=1, score=1, total_cards=2)
        attempt2 = DeckAttempt(id=2, user_id=1, deck_id=1, score=2, total_cards=4)
        session.add_all([user, attempt1, attempt2])
        await session.commit()
        
        # Create mock user answer logs on distinct days
        # Day 1: 2 reviews at hour 08
        dt1_1 = datetime(2026, 6, 10, 8, 30, 0)
        dt1_2 = datetime(2026, 6, 10, 8, 45, 0)
        # Day 2: 4 reviews at hour 08
        dt2_1 = datetime(2026, 6, 11, 8, 15, 0)
        dt2_2 = datetime(2026, 6, 11, 8, 20, 0)
        dt2_3 = datetime(2026, 6, 11, 8, 25, 0)
        dt2_4 = datetime(2026, 6, 11, 8, 30, 0)
        
        ua1 = UserAnswer(id=1, attempt_id=1, card_id=1, is_correct=True, created_at=dt1_1, active_time=5)
        ua2 = UserAnswer(id=2, attempt_id=1, card_id=2, is_correct=True, created_at=dt1_2, active_time=5)
        ua3 = UserAnswer(id=3, attempt_id=2, card_id=1, is_correct=True, created_at=dt2_1, active_time=5)
        ua4 = UserAnswer(id=4, attempt_id=2, card_id=2, is_correct=True, created_at=dt2_2, active_time=5)
        ua5 = UserAnswer(id=5, attempt_id=2, card_id=3, is_correct=True, created_at=dt2_3, active_time=5)
        ua6 = UserAnswer(id=6, attempt_id=2, card_id=4, is_correct=True, created_at=dt2_4, active_time=5)
        
        session.add_all([ua1, ua2, ua3, ua4, ua5, ua6])
        await session.commit()
        
        # Test Query 1: Active study days count
        active_days_stmt = select(
            func.count(func.distinct(func.date(UserAnswer.created_at)))
        ).select_from(UserAnswer)\
         .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
         .where(DeckAttempt.user_id == 1)
        
        active_days_res = await session.execute(active_days_stmt)
        active_days_count = active_days_res.scalar() or 1
        
        assert active_days_count == 2
        
        # Test Query 2: Hourly distribution stats
        hour_stmt = select(
            extract('hour', UserAnswer.created_at).label("hour"),
            func.count(UserAnswer.id).label("count")
        ).select_from(UserAnswer)\
         .join(DeckAttempt, UserAnswer.attempt_id == DeckAttempt.id)\
         .where(DeckAttempt.user_id == 1)\
         .group_by("hour")
         
        hour_results = await session.execute(hour_stmt)
        hourly_data = {i: 0 for i in range(24)}
        for row in hour_results.all():
            h = int(row[0]) if row[0] is not None else 0
            hourly_data[h] = row[1]
            
        assert hourly_data[8] == 6
        
        # Test Calculation: Hourly daily average
        average_val = round(hourly_data[8] / active_days_count, 2)
        assert average_val == 3.0
