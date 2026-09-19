from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Index, UniqueConstraint
from datetime import datetime
from app.core.db import Base

class MemriseCardProgress(Base):
    __tablename__ = "memrise_card_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "card_id", name="uq_memrise_user_card"),
        Index("ix_memrise_card_progress_user_deck_bloomed", "user_id", "deck_id", "is_bloomed"),
        Index("ix_memrise_card_progress_user_water_due", "user_id", "next_water_at"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    card_id = Column(Integer, ForeignKey("flashcards.id"), index=True)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id"), index=True)
    
    stage = Column(Integer, default=0) # 0=unseen, 1=introduced, 2=mcq_forward, 3=mcq_reverse, 4=audio, 5=typing, 6=bloomed
    is_bloomed = Column(Boolean, default=False)
    bloom_count = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    watering_level = Column(Integer, default=0)
    next_water_at = Column(DateTime, nullable=True)
    last_reviewed_at = Column(DateTime, nullable=True)
    
    total_correct = Column(Integer, default=0)
    total_wrong = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class MemriseSession(Base):
    __tablename__ = "memrise_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id"), index=True)
    session_type = Column(String(20)) # plant or water
    
    cards_studied = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    duration_seconds = Column(Integer, default=0)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
