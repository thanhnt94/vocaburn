from sqlalchemy import Column, Integer, Float, DateTime, String, Boolean, ForeignKey, Index
from app.core.db import Base
from datetime import datetime

class UserDailyStats(Base):
    __tablename__ = "user_daily_stats"
    __table_args__ = (Index("ix_user_daily_stats_user_date", "user_id", "date"),)
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    date = Column(DateTime, default=datetime.utcnow)
    questions_attempted = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    total_time_seconds = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True, server_default='1')
    is_frozen = Column(Boolean, default=False, server_default='0')


