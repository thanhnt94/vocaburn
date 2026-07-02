from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class CardSchema(BaseModel):
    id: Optional[int] = None
    content: str
    front_audio_content: Optional[str] = None
    back_audio_content: Optional[str] = None
    front_audio_url: Optional[str] = None
    back_audio_url: Optional[str] = None
    audio: Optional[str] = None
    front_img: Optional[str] = None
    back_img: Optional[str] = None
    question_type: str = "flashcard"
    explanation: Optional[str] = None
    others: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class DeckSchema(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    category_id: int
    creator_id: Optional[int] = None
    instruction: Optional[str] = None
    cover_image: Optional[str] = None
    time_limit: int = 0
    is_active: bool = True
    is_public: bool = True
    cards: Optional[List[CardSchema]] = []

    class Config:
        from_attributes = True

class CategorySchema(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class ContributionCreate(BaseModel):
    content: str
    type: str = "comment" # comment, correction
    parent_id: Optional[int] = None


class ContributionStatusUpdate(BaseModel):
    status: str


class UserMinimal(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class ContributionResponse(BaseModel):
    id: int
    card_id: int
    user_id: int
    parent_id: Optional[int] = None
    type: str
    content: str
    status: str
    likes_count: int
    is_liked_by_me: bool = False
    created_at: Any
    user: UserMinimal
    replies: List["ContributionResponse"] = []

    class Config:
        from_attributes = True

