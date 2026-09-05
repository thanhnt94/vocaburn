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


class CardExplainRequest(BaseModel):
    card: Optional[str] = None
    question: Optional[str] = None
    options: Optional[List[str]] = []
    correct_answer: Optional[str] = None


class CardAnswerRequest(BaseModel):
    card_id: int
    is_correct: bool = False
    rating: Optional[int] = None
    active_time: float = 0.0
    mode: Optional[str] = "fsrs"
    practice_mode: Optional[str] = None


class DeckSettingsUpdateRequest(BaseModel):
    settings: Dict[str, Any]


class RoadmapTestSubmitRequest(BaseModel):
    answers: Optional[List[Dict[str, Any]]] = []
    score: Optional[int] = 0
    total: Optional[int] = 0
    mode: Optional[str] = "roadmap_test"


class UserSettingsUpdateRequest(BaseModel):
    theme: Optional[str] = None
    focus_timer_active: Optional[bool] = None
    sfx_enabled: Optional[bool] = None
    haptic_enabled: Optional[bool] = None
    autoplay_audio: Optional[str] = None
    quick_learn_enabled: Optional[bool] = None
    random_enabled: Optional[bool] = None
    show_images: Optional[str] = None
    show_fsrs: Optional[bool] = None
    quiz_learning_mode: Optional[str] = None
    practice_submode: Optional[str] = None
    practice_range: Optional[str] = None
    score_mode: Optional[str] = None
    time_mode: Optional[str] = None
    last_deck_id: Optional[int] = None
    paste_columns: Optional[List[str]] = None
    quick_add_columns: Optional[List[str]] = None
    card_flip_trigger: Optional[str] = None
    card_rating_mode: Optional[str] = None


