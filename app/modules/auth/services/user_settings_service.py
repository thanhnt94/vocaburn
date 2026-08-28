from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.auth.models import UserGlobalSettings

class UserSettingsService:
    @staticmethod
    async def get_or_create_settings(db: AsyncSession, user_id: int) -> UserGlobalSettings:
        stmt = select(UserGlobalSettings).where(UserGlobalSettings.user_id == user_id)
        result = await db.execute(stmt)
        settings_obj = result.scalar_one_or_none()
        
        if not settings_obj:
            settings_obj = UserGlobalSettings(user_id=user_id)
            db.add(settings_obj)
            await db.commit()
            await db.refresh(settings_obj)
            
        return settings_obj

    @staticmethod
    async def update_settings(db: AsyncSession, user_id: int, data: dict) -> UserGlobalSettings:
        settings_obj = await UserSettingsService.get_or_create_settings(db, user_id)
        
        allowed_fields = {
            "theme", "focus_timer_active", "sfx_enabled", "haptic_enabled",
            "autoplay_audio", "quick_learn_enabled", "random_enabled",
            "show_images", "show_fsrs", "quiz_learning_mode",
            "practice_submode", "practice_range", "score_mode", "time_mode",
            "last_deck_id", "paste_columns", "quick_add_columns"
        }
        
        updated = False
        for k, v in data.items():
            if k in allowed_fields and hasattr(settings_obj, k):
                setattr(settings_obj, k, v)
                updated = True
                
        if updated:
            await db.commit()
            await db.refresh(settings_obj)
            
        return settings_obj

    @staticmethod
    def to_dict(settings_obj: UserGlobalSettings) -> dict:
        if not settings_obj:
            return {}
        return {
            "theme": settings_obj.theme,
            "focus_timer_active": settings_obj.focus_timer_active,
            "sfx_enabled": settings_obj.sfx_enabled,
            "haptic_enabled": settings_obj.haptic_enabled,
            "autoplay_audio": settings_obj.autoplay_audio,
            "quick_learn_enabled": settings_obj.quick_learn_enabled,
            "random_enabled": settings_obj.random_enabled,
            "show_images": settings_obj.show_images,
            "show_fsrs": settings_obj.show_fsrs,
            "quiz_learning_mode": settings_obj.quiz_learning_mode,
            "practice_submode": settings_obj.practice_submode,
            "practice_range": settings_obj.practice_range,
            "score_mode": settings_obj.score_mode,
            "time_mode": settings_obj.time_mode,
            "last_deck_id": settings_obj.last_deck_id,
            "paste_columns": settings_obj.paste_columns or ["front", "back"],
            "quick_add_columns": settings_obj.quick_add_columns or ["front", "back"],
        }
