from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255), nullable=True) # Null if only SSO
    full_name = Column(String(255))
    role = Column(String(50), default="user") # admin, user
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # SSO related
    sso_id = Column(String(255), unique=True, index=True, nullable=True)


class UserGlobalSettings(Base):
    __tablename__ = "user_global_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    
    # UI Theme & System Preferences
    theme = Column(String(20), default="light") # 'light' | 'dark'
    focus_timer_active = Column(Boolean, default=True)
    sfx_enabled = Column(Boolean, default=True)
    haptic_enabled = Column(Boolean, default=True)
    autoplay_audio = Column(String(20), default="never") # 'never' | 'always' | 'question'
    quick_learn_enabled = Column(Boolean, default=False)
    random_enabled = Column(Boolean, default=False)
    show_images = Column(String(20), default="always")
    show_fsrs = Column(Boolean, default=True)
    card_flip_trigger = Column(String(20), default="both") # 'both' | 'tap' | 'button_only'
    card_rating_mode = Column(String(20), default="both") # 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way'
    
    # Study Modes & Preferences
    quiz_learning_mode = Column(String(50), default="fsrs") # 'fsrs' | 'leitner' | 'practice'
    practice_submode = Column(String(50), default="mcq") # 'mcq' | 'typing' | 'listening'
    practice_range = Column(String(20), default="all") # 'all' | 'learned'
    
    # Session Display Preferences
    score_mode = Column(String(20), default="all") # 'today' | 'all'
    time_mode = Column(String(20), default="card") # 'card' | 'today' | 'all'
    last_deck_id = Column(Integer, nullable=True)
    paste_columns = Column(JSON, nullable=True, default=lambda: ["front", "back"])
    quick_add_columns = Column(JSON, nullable=True, default=lambda: ["front", "back"])
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")

