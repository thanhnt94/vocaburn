from fastapi import APIRouter
from .play_grading import router as play_grading_router
from .play_data import router as play_data_router
from .play_session import router as play_session_router
from .play_utils import resolve_play_cards

router = APIRouter(tags=["Deck Play"])

router.include_router(play_grading_router)
router.include_router(play_data_router)
router.include_router(play_session_router)
