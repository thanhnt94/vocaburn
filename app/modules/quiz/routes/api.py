from fastapi import APIRouter
from app.modules.quiz.routes.crud import router as crud_router
from app.modules.quiz.routes.play import router as play_router
from app.modules.quiz.routes.stats import router as stats_router
from app.modules.quiz.routes.features import router as features_router
from app.modules.quiz.routes.review_routes import router as review_router

router = APIRouter(prefix="/quiz", tags=["Quiz"])

router.include_router(crud_router)
router.include_router(play_router)
router.include_router(stats_router)
router.include_router(features_router)
router.include_router(review_router)

