from fastapi import APIRouter
from app.modules.deck.routes.crud import router as crud_router
from app.modules.deck.routes.play import router as play_router
from app.modules.deck.routes.stats import router as stats_router
from app.modules.deck.routes.features import router as features_router
from app.modules.deck.routes.review_routes import router as review_router

router = APIRouter(prefix="/deck", tags=["Deck"])

router.include_router(crud_router)
router.include_router(play_router)
router.include_router(stats_router)
router.include_router(features_router)
router.include_router(review_router)
