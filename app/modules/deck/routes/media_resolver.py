from sqlalchemy import select
from app.modules.sso_module.models import SSOConfig

async def get_sso_server_url(db) -> str:
    try:
        res = await db.execute(select(SSOConfig))
        config = res.scalar_one_or_none()
        if config and config.is_enabled and config.server_url:
            return config.server_url.rstrip("/")
    except Exception:
        pass
    return ""

def resolve_central_url(url: str, sso_url: str) -> str:
    if not url:
        return url
    if url.startswith("central-media://"):
        filename = url[len("central-media://"):]
        return f"{sso_url}/static/uploads/media/{filename}" if sso_url else f"/static/uploads/media/{filename}"
    if url.startswith("central-tts://"):
        filename = url[len("central-tts://"):]
        return f"{sso_url}/static/uploads/tts/{filename}" if sso_url else f"/static/uploads/tts/{filename}"
    return url

def resolve_card_dict(c_dict: dict, sso_url: str) -> dict:
    for field in ["front_audio_url", "back_audio_url", "front_img", "back_img"]:
        if field in c_dict:
            c_dict[field] = resolve_central_url(c_dict[field], sso_url)
    
    # Also resolve inside c_dict["others"] if present
    others = c_dict.get("others")
    if isinstance(others, dict):
        for field in ["front_audio_url", "back_audio_url", "front_img", "back_img"]:
            if field in others:
                others[field] = resolve_central_url(others[field], sso_url)
    return c_dict
