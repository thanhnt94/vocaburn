import re
from sqlalchemy import select
from app.modules.sso_module.models import SSOConfig

async def get_sso_server_url(db) -> str:
    try:
        res = await db.execute(select(SSOConfig))
        config = res.scalar_one_or_none()
        if config and config.is_enabled and config.server_url:
            s_url = config.server_url.rstrip("/")
            if "auth.inmind.site" in s_url or "centralauth.inmind.site" in s_url:
                return "https://inmind.site"
            return s_url
    except Exception:
        pass
    return "https://inmind.site"

def resolve_central_url(url: str, sso_url: str = "") -> str:
    if not url or not isinstance(url, str):
        return url
    trimmed = url.strip()
    base_sso = (sso_url or "https://inmind.site").rstrip("/")
    if "auth.inmind.site" in base_sso or "centralauth.inmind.site" in base_sso:
        base_sso = "https://inmind.site"

    if "auth.inmind.site" in trimmed or "centralauth.inmind.site" in trimmed:
        trimmed = re.sub(r"https?://(?:auth|centralauth)\.inmind\.site", base_sso, trimmed)

    if trimmed.startswith("central-media://"):
        filename = trimmed[len("central-media://"):]
        return f"{base_sso}/static/uploads/media/{filename}"
    if trimmed.startswith("central-tts://"):
        filename = trimmed[len("central-tts://"):]
        return f"{base_sso}/static/uploads/tts/{filename}"
    if trimmed.startswith("/static/uploads/"):
        return f"{base_sso}{trimmed}"
    return trimmed

def resolve_card_dict(c_dict: dict, sso_url: str) -> dict:
    if not isinstance(c_dict, dict):
        return c_dict
        
    for field in ["audio", "front_audio_url", "back_audio_url", "front_img", "back_img", "cover_image"]:
        if field in c_dict and c_dict[field]:
            c_dict[field] = resolve_central_url(c_dict[field], sso_url)
    
    # Also resolve inside c_dict["others"] if present
    others = c_dict.get("others")
    if isinstance(others, dict):
        for field in ["audio", "front_audio_url", "back_audio_url", "front_img", "back_img"]:
            if field in others and others[field]:
                others[field] = resolve_central_url(others[field], sso_url)
    return c_dict

def unresolve_central_url(url: str, sso_url: str = "") -> str:
    if not url or not isinstance(url, str):
        return url
    trimmed = url.strip()
    if trimmed.startswith("central-media://") or trimmed.startswith("central-tts://"):
        return trimmed

    # Robust regex matching: recognizes any domain or relative path pointing to uploads
    tts_match = re.search(r"(?:https?://[^/]+)?/static/uploads/tts/([^\s?#]+)", trimmed)
    if tts_match:
        return f"central-tts://{tts_match.group(1)}"

    media_match = re.search(r"(?:https?://[^/]+)?/static/uploads/media/([^\s?#]+)", trimmed)
    if media_match:
        return f"central-media://{media_match.group(1)}"

    if sso_url:
        sso_url_clean = sso_url.rstrip("/")
        if trimmed.startswith(f"{sso_url_clean}/static/uploads/media/"):
            filename = trimmed[len(f"{sso_url_clean}/static/uploads/media/"):]
            return f"central-media://{filename}"
        if trimmed.startswith(f"{sso_url_clean}/static/uploads/tts/"):
            filename = trimmed[len(f"{sso_url_clean}/static/uploads/tts/"):]
            return f"central-tts://{filename}"

    return trimmed

def unresolve_card_dict(c_dict: dict, sso_url: str = "") -> dict:
    if not isinstance(c_dict, dict):
        return c_dict

    for field in ["audio", "front_audio_url", "back_audio_url", "front_img", "back_img", "cover_image"]:
        if field in c_dict and isinstance(c_dict[field], str):
            c_dict[field] = unresolve_central_url(c_dict[field], sso_url)
    
    others = c_dict.get("others")
    if isinstance(others, dict):
        for field in ["audio", "front_audio_url", "back_audio_url", "front_img", "back_img"]:
            if field in others and isinstance(others[field], str):
                others[field] = unresolve_central_url(others[field], sso_url)
    return c_dict
