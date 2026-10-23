from fastapi import APIRouter
from .deck_practice_settings import router as practice_settings_router
from .card_actions import router as card_actions_router
from .deck_excel import router as excel_router
from .deck_schema import router as schema_router
from .deck_automation import router as automation_router

router = APIRouter(tags=["Deck"])

router.include_router(practice_settings_router)
router.include_router(card_actions_router)
router.include_router(excel_router)
router.include_router(schema_router)
router.include_router(automation_router)
