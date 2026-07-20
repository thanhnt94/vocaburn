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
    for field in ["audio", "front_audio_url", "back_audio_url", "front_img", "back_img"]:
        if field in c_dict:
            c_dict[field] = resolve_central_url(c_dict[field], sso_url)
    
    # Also resolve inside c_dict["others"] if present
    others = c_dict.get("others")
    if isinstance(others, dict):
        for field in ["audio", "front_audio_url", "back_audio_url", "front_img", "back_img"]:
            if field in others:
                others[field] = resolve_central_url(others[field], sso_url)
    return c_dict

def unresolve_central_url(url: str, sso_url: str) -> str:
    if not url or not sso_url:
        return url
    sso_url_clean = sso_url.rstrip("/")
    # Check with sso url
    if url.startswith(f"{sso_url_clean}/static/uploads/media/"):
        filename = url[len(f"{sso_url_clean}/static/uploads/media/"):]
        return f"central-media://{filename}"
    if url.startswith(f"{sso_url_clean}/static/uploads/tts/"):
        filename = url[len(f"{sso_url_clean}/static/uploads/tts/"):]
        return f"central-tts://{filename}"
    # Fallback to check relative paths if sent by frontend
    if url.startswith("/static/uploads/media/"):
        filename = url[len("/static/uploads/media/"):]
        return f"central-media://{filename}"
    if url.startswith("/static/uploads/tts/"):
        filename = url[len("/static/uploads/tts/"):]
        return f"central-tts://{filename}"
    return url

def unresolve_card_dict(c_dict: dict, sso_url: str) -> dict:
    for field in ["audio", "front_audio_url", "back_audio_url", "front_img", "back_img"]:
        if field in c_dict and isinstance(c_dict[field], str):
            c_dict[field] = unresolve_central_url(c_dict[field], sso_url)
    
    others = c_dict.get("others")
    if isinstance(others, dict):
        for field in ["audio", "front_audio_url", "back_audio_url", "front_img", "back_img"]:
            if field in others and isinstance(others[field], str):
                others[field] = unresolve_central_url(others[field], sso_url)
    return c_dict
