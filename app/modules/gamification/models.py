from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Date, Index
from sqlalchemy.orm import relationship
from app.core.db import Base
from datetime import datetime

class UserGamification(Base):
    __tablename__ = "user_gamification"
    
    user_id = Column(Integer, primary_key=True)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak_count = Column(Integer, default=0)
    streak_points = Column(Integer, default=0) # Reward points currency
    streak_freeze_count = Column(Integer, default=0) # Number of streak freeze cards (max 2)
    last_freeze_used_at = Column(DateTime, nullable=True) # Last date a streak freeze was auto-used
    last_activity = Column(DateTime, default=datetime.utcnow)
    badges = Column(JSON, default=list) # List of badge IDs earned

class Badge(Base):
    __tablename__ = "badges"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100))
    description = Column(String(255))
    icon = Column(String(50)) # Lucide icon name
    criteria_type = Column(String(50)) # 'xp', 'streak', 'accuracy'
    criteria_value = Column(Integer)

class UserDailyActivity(Base):
    __tablename__ = "user_daily_activities"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    activity_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class XPTransaction(Base):
    __tablename__ = "xp_transactions"
    __table_args__ = (Index("ix_xp_transactions_user_created", "user_id", "created_at"),)
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    source = Column(String(100), nullable=False) # e.g., 'quiz_answer', 'streak_bonus', 'badge_unlock', 'daily_goal'
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class UserBadge(Base):
    __tablename__ = "user_badges"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    badge_id = Column(String(50), ForeignKey("badges.id"), primary_key=True)
    earned_at = Column(DateTime, default=datetime.utcnow)

class PointTransaction(Base):
    __tablename__ = "point_transactions"
    __table_args__ = (Index("ix_point_transactions_user_created", "user_id", "created_at"),)
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    source = Column(String(100), nullable=False) # 'daily_target', 'double_target', 'buy_freeze'
    created_at = Column(DateTime, default=datetime.utcnow, index=True)




