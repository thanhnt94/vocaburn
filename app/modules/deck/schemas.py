from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class CardSchema(BaseModel):
    id: Optional[int] = None
    content: str
    image: Optional[str] = None
    audio: Optional[str] = None
    question_type: str = "flashcard"
    explanation: Optional[str] = None
    ai_explanation: Optional[str] = None
    others: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class DeckSchema(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    category_id: int
    creator_id: Optional[int] = None
    ai_prompt: Optional[str] = None
    instruction: Optional[str] = None
    time_limit: int = 0
    is_active: bool = True
    cards: Optional[List[CardSchema]] = []

    class Config:
        from_attributes = True

class CategorySchema(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
