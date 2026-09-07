from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.admin.models import SystemConfig, AdminLog

class AdminInterface:
    @staticmethod
    async def get_sso_config(db: AsyncSession):
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "sso_config"))
        config = result.scalar_one_or_none()
        if config and isinstance(config.value, dict):
            return config.value

        # Fallback to SSOConfig table if exists
        try:
            from app.modules.sso_module.models import SSOConfig
            sso_res = await db.execute(select(SSOConfig))
            sso_obj = sso_res.scalar_one_or_none()
            if sso_obj and sso_obj.server_url:
                return {
                    "central_auth_url": sso_obj.server_url,
                    "client_id": sso_obj.client_id or "",
                    "client_secret": sso_obj.client_secret or "",
                    "enabled": bool(sso_obj.is_enabled)
                }
        except Exception:
            pass

        from app.core.config import settings
        default_url = getattr(settings, "CENTRAL_AUTH_URL", "") or ""
        return {
            "central_auth_url": default_url,
            "client_id": getattr(settings, "CLIENT_ID", "") or "",
            "client_secret": getattr(settings, "CLIENT_SECRET", "") or "",
            "enabled": False
        }

    @staticmethod
    async def update_sso_config(db: AsyncSession, config_data: dict, admin_id: int):
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "sso_config"))
        config = result.scalar_one_or_none()
        if not config:
            config = SystemConfig(id="sso_config")
            db.add(config)
        
        config.value = config_data
        
        # Keep sso_settings table (SSOConfig model) in sync for auth system routes
        try:
            from app.modules.sso_module.models import SSOConfig
            sso_result = await db.execute(select(SSOConfig))
            sso_config = sso_result.scalar_one_or_none()
            if not sso_config:
                sso_config = SSOConfig()
                db.add(sso_config)
            
            sso_config.is_enabled = bool(config_data.get("enabled", False))
            sso_config.server_url = config_data.get("central_auth_url")
            sso_config.client_id = config_data.get("client_id")
            sso_config.client_secret = config_data.get("client_secret")
        except Exception as e:
            # Prevent failure if tables are migrating
            pass
        
        # Log action
        log = AdminLog(admin_id=admin_id, action="UPDATE_SSO", details="Updated CentralAuth settings")
        db.add(log)
        await db.commit()
        return True

    @staticmethod
    async def get_ai_config(db: AsyncSession):
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "google_ai_config"))
        config = result.scalar_one_or_none()
        if not config:
            return {
                "api_key": "",
                "model_id": "gemini-2.0-flash",
                "enabled": False
            }
        return config.value

    @staticmethod
    async def update_ai_config(db: AsyncSession, config_data: dict, admin_id: int):
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "google_ai_config"))
        config = result.scalar_one_or_none()
        if not config:
            config = SystemConfig(id="google_ai_config")
            db.add(config)
        
        config.value = config_data
        
        # Log action
        log = AdminLog(admin_id=admin_id, action="UPDATE_AI", details=f"Updated Google AI settings: {config_data.get('model_id')}")
        db.add(log)
        await db.commit()
        return True

    @staticmethod
    async def get_study_templates(db: AsyncSession) -> list[dict]:
        from app.modules.deck.utils import SYSTEM_STUDY_PROFILES, set_cached_system_study_profiles
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "study_templates"))
        config = result.scalar_one_or_none()
        if not config or not config.value:
            set_cached_system_study_profiles(SYSTEM_STUDY_PROFILES)
            return [dict(p) for p in SYSTEM_STUDY_PROFILES]
        set_cached_system_study_profiles(config.value)
        return [dict(p) for p in config.value]

    @staticmethod
    async def update_study_templates(db: AsyncSession, templates: list[dict], admin_id: int):
        from app.modules.deck.utils import set_cached_system_study_profiles
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "study_templates"))
        config = result.scalar_one_or_none()
        if not config:
            config = SystemConfig(id="study_templates")
            db.add(config)
        
        config.value = templates
        set_cached_system_study_profiles(templates)
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(config, "value")
        
        log = AdminLog(admin_id=admin_id, action="UPDATE_TEMPLATES", details=f"Updated {len(templates)} study templates")
        db.add(log)
        await db.commit()
        return True

    @staticmethod
    async def reset_study_templates(db: AsyncSession, admin_id: int):
        from app.modules.deck.utils import SYSTEM_STUDY_PROFILES, set_cached_system_study_profiles
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "study_templates"))
        config = result.scalar_one_or_none()
        if not config:
            config = SystemConfig(id="study_templates")
            db.add(config)
            
        config.value = SYSTEM_STUDY_PROFILES
        set_cached_system_study_profiles(SYSTEM_STUDY_PROFILES)
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(config, "value")
        
        log = AdminLog(admin_id=admin_id, action="RESET_TEMPLATES", details="Reset study templates to system defaults")
        db.add(log)
        await db.commit()
        return [dict(p) for p in SYSTEM_STUDY_PROFILES]
