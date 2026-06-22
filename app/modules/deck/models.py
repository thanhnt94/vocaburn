from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, JSON, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    decks = relationship("FlashcardDeck", back_populates="category")

class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), index=True)
    creator_id = Column(Integer, nullable=True) # ID of the user who created/uploaded it
    ai_prompt = Column(Text, nullable=True) # System prompt for AI generation related to this deck
    ai_prompt_hint = Column(Text, nullable=True) # System prompt for AI hint generation
    ai_prompt_mnemonic = Column(Text, nullable=True) # System prompt for AI mnemonic generation
    instruction = Column(Text, nullable=True) # General instruction for the entire deck
    cover_image = Column(String(512), nullable=True) # URL to the cover image
    time_limit = Column(Integer, default=0) # in minutes, 0 means no limit
    is_active = Column(Boolean, default=True)
    practice_settings = Column(JSON, nullable=True) # Default creator configurations for practice modes
    created_at = Column(DateTime, default=datetime.utcnow)
    
    category = relationship("Category", back_populates="decks")
    cards = relationship("Flashcard", back_populates="deck", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="deck_tags", back_populates="decks")
    collaborators = relationship("DeckCollaborator", back_populates="deck", cascade="all, delete-orphan")

class Flashcard(Base):
    __tablename__ = "flashcards"
    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column("quiz_id", Integer, ForeignKey("flashcard_decks.id"), index=True)
    content = Column(Text, nullable=False)
    image = Column(String(512), nullable=True)
    audio = Column(String(512), nullable=True)
    question_type = Column(String(50), default="flashcard")
    explanation = Column(Text, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    hint = Column(Text, nullable=True)
    mnemonic = Column(Text, nullable=True)
    others = Column(JSON, nullable=True)
    
    deck = relationship("FlashcardDeck", back_populates="cards")

class DeckAttempt(Base):
    __tablename__ = "deck_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    deck_id = Column("quiz_id", Integer, ForeignKey("flashcard_decks.id"), index=True)
    mode = Column(String(50)) # sequential, random, mastery
    score = Column(Integer, default=0)
    total_cards = Column("total_questions", Integer, default=0)
    is_archived = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    answers = relationship("UserAnswer", back_populates="attempt", cascade="all, delete-orphan")

class UserAnswer(Base):
    __tablename__ = "card_answers"
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("deck_attempts.id"), index=True)
    card_id = Column("question_id", Integer, ForeignKey("flashcards.id"), index=True)
    is_correct = Column(Boolean, default=False)
    active_time = Column(Float, default=0.0)
    rating = Column(Integer, nullable=True) # FSRS Rating: 1=Again, 2=Hard, 3=Good, 4=Easy
    created_at = Column(DateTime, default=datetime.utcnow)
    
    attempt = relationship("DeckAttempt", back_populates="answers")

class DeckSession(Base):
    __tablename__ = "deck_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    deck_id = Column("quiz_id", Integer, ForeignKey("flashcard_decks.id"), index=True)
    mode = Column(String) # classic, chaos, mastery, batch
    current_index = Column(Integer, default=0)
    state_json = Column(String) # For storing card order/answers
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserCardNote(Base):
    __tablename__ = "user_card_notes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    card_id = Column("question_id", Integer, ForeignKey("flashcards.id"), index=True)
    content = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    card = relationship("Flashcard")

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    decks = relationship("FlashcardDeck", secondary="deck_tags", back_populates="tags")

class DeckTag(Base):
    __tablename__ = "deck_tags"
    deck_id = Column("quiz_id", Integer, ForeignKey("flashcard_decks.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)

class DeckRoom(Base):
    __tablename__ = "deck_rooms"
    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column("quiz_id", Integer, ForeignKey("flashcard_decks.id"), index=True)
    room_code = Column(String(20), unique=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id"), index=True)
    status = Column(String(50), default="waiting") # waiting, active, finished
    settings = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    
    deck = relationship("FlashcardDeck")
    host = relationship("User")
    participants = relationship("DeckRoomParticipant", back_populates="room", cascade="all, delete-orphan")

class DeckRoomParticipant(Base):
    __tablename__ = "deck_room_participants"
    id = Column(Integer, primary_key=True, index=True)
    deck_room_id = Column("room_id", Integer, ForeignKey("deck_rooms.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    is_ready = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    total_answered = Column(Integer, default=0)
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    room = relationship("DeckRoom", back_populates="participants")
    user = relationship("User")

class DeckRoomChat(Base):
    __tablename__ = "deck_room_chats"
    id = Column(Integer, primary_key=True, index=True)
    deck_room_id = Column("room_id", Integer, ForeignKey("deck_rooms.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    room = relationship("DeckRoom")
    user = relationship("User")

class DeckCollaborator(Base):
    __tablename__ = "deck_collaborators"
    deck_id = Column("quiz_id", Integer, ForeignKey("flashcard_decks.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    deck = relationship("FlashcardDeck", back_populates="collaborators")
    user = relationship("User")

class UserDeckGoal(Base):
    __tablename__ = "user_deck_goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    deck_id = Column("quiz_id", Integer, ForeignKey("flashcard_decks.id"), index=True)
    daily_target = Column(Integer, default=5) # daily new card target
    daily_time_target = Column(Integer, default=10) # in minutes
    daily_card_target = Column(Integer, default=20) # total cards
    streak_count = Column(Integer, default=0)
    last_completed_date = Column(String(50), nullable=True) # YYYY-MM-DD
    status = Column(String(50), default="active") # active, paused, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    deck = relationship("FlashcardDeck")

class UserDailyProgress(Base):
    __tablename__ = "user_daily_progress"
    __table_args__ = (UniqueConstraint("goal_id", "date", name="uq_goal_date"),)
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("user_deck_goals.id"), index=True)
    date = Column(String(50), index=True) # YYYY-MM-DD
    count_done = Column(Integer, default=0)
    is_target_met = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    goal = relationship("UserDeckGoal")

class UserCardMastery(Base):
    __tablename__ = "user_card_mastery"
    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_user_question"),)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    card_id = Column("question_id", Integer, ForeignKey("flashcards.id"), index=True)
    is_ignored = Column(Boolean, default=False, nullable=False, server_default='0')
    box_level = Column(Integer, default=1)  # Leitner system box 1-5 (Mastery level)
    consecutive_correct = Column(Integer, default=0)
    last_answered = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # FSRS v6 attributes
    stability = Column(Float, nullable=True)
    difficulty = Column(Float, nullable=True)
    state = Column(Integer, default=0) # 0=New, 1=Learning, 2=Review, 3=Relearning
    step = Column(Integer, default=0)
    due = Column(DateTime, default=datetime.utcnow, index=True)
    last_review = Column(DateTime, nullable=True)
    
    card = relationship("Flashcard")

class UserDeckSettings(Base):
    __tablename__ = "user_deck_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # ID of the user (e.g. from cookie/auth)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id"), index=True)
    settings = Column(JSON, nullable=True) # Custom mappings/configurations chosen by the learner
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    deck = relationship("FlashcardDeck")

class UserGlobalGoal(Base):
    __tablename__ = "user_global_goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    daily_time_target = Column(Integer, default=20) # in minutes
    daily_card_target = Column(Integer, default=20) # number of cards
    daily_new_card_target = Column(Integer, default=10) # number of new cards
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


class UserPracticeStats(Base):
    __tablename__ = "user_practice_stats"
    __table_args__ = (UniqueConstraint("user_id", "question_id", "practice_mode", name="uq_user_card_mode"),)
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    card_id = Column("question_id", Integer, ForeignKey("flashcards.id"), index=True)
    practice_mode = Column(String(50), default="mcq")  # mcq, typing, listening
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    total_time_spent = Column(Float, default=0.0)      # total time spent on this card in seconds
    last_practiced = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    card = relationship("Flashcard")

