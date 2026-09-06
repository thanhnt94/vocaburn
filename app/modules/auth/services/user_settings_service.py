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
            "last_deck_id", "paste_columns", "quick_add_columns",
            "card_flip_trigger", "card_rating_mode",
            "front_valign", "front_halign", "front_font_size", "back_valign", "back_halign",
            "study_profiles", "active_profile_id"
        }
        
        updated = False
        for k, v in data.items():
            if k in allowed_fields and hasattr(settings_obj, k):
                if k == "study_profiles" and isinstance(v, list):
                    # Sanitize: never persist system presets into user's custom study_profiles
                    v = [
                        p for p in v
                        if isinstance(p, dict) and not p.get("is_system") and not str(p.get("id", "")).startswith("preset-")
                    ]
                setattr(settings_obj, k, v)
                updated = True
                
        if updated:
            from sqlalchemy.orm.attributes import flag_modified
            if "study_profiles" in data:
                flag_modified(settings_obj, "study_profiles")
            await db.commit()
            await db.refresh(settings_obj)
            
        return settings_obj

    @staticmethod
    def to_dict(settings_obj: UserGlobalSettings) -> dict:
        if not settings_obj:
            return {}
        from app.modules.deck.utils import get_all_study_profiles
        raw_profiles = getattr(settings_obj, 'study_profiles', None) or []
        custom_profiles = [
            p for p in raw_profiles
            if isinstance(p, dict) and not p.get("is_system") and not str(p.get("id", "")).startswith("preset-")
        ]
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
            "card_flip_trigger": getattr(settings_obj, 'card_flip_trigger', 'both') or "both",
            "card_rating_mode": getattr(settings_obj, 'card_rating_mode', 'both') or "both",
            "front_valign": getattr(settings_obj, 'front_valign', 'center') or "center",
            "front_halign": getattr(settings_obj, 'front_halign', 'left') or "left",
            "front_font_size": getattr(settings_obj, 'front_font_size', '100%') or "100%",
            "back_valign": getattr(settings_obj, 'back_valign', 'center') or "center",
            "back_halign": getattr(settings_obj, 'back_halign', 'left') or "left",
            "study_profiles": get_all_study_profiles(custom_profiles),
            "custom_study_profiles": custom_profiles,
            "active_profile_id": getattr(settings_obj, 'active_profile_id', None),
        }
