from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)

def fix_static_urls(val: Any) -> Any:
    """Recursively replaces /static/uploads/ with /uploads/ in strings, dicts, and lists."""
    if not val:
        return val
    if isinstance(val, str):
        return val.replace("/static/uploads/", "/uploads/")
    if isinstance(val, dict):
        return {k: fix_static_urls(v) for k, v in val.items()}
    if isinstance(val, list):
        return [fix_static_urls(item) for item in val]
    return val

def migrate_practice_settings(settings: Optional[dict]) -> dict:
    """Normalizes legacy practice settings into structured mcq, typing, listening config dict."""
    if not settings:
        return {}
    if any(k in settings for k in ("mcq", "typing", "listening")):
        return settings
    active_pairs = settings.get("active_pairs", [])
    num_choices = settings.get("num_choices", 4)
    new_settings = dict(settings)
    new_settings["mcq"] = {"active_pairs": active_pairs, "num_choices": num_choices}
    new_settings["typing"] = {"active_pairs": active_pairs}
    new_settings["listening"] = {"active_pairs": active_pairs, "num_choices": num_choices}
    return new_settings

def extract_card_val(card: Any, key: Optional[str]) -> str:
    """Extracts text content for a given column key from a Flashcard object."""
    if not key:
        return (getattr(card, "content", None) or "").strip()
    # 1. Check card.others dict FIRST for custom column keys (e.g. kanji, meaning, hiragana, etc.)
    if hasattr(card, "others") and card.others and isinstance(card.others, dict) and key in card.others:
        val = card.others.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    if key in ("front", "content"):
        return (getattr(card, "content", None) or "").strip()
    if key in ("back", "explanation"):
        return (getattr(card, "explanation", None) or "").strip()
    if hasattr(card, key):
        val = getattr(card, key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return (getattr(card, "explanation", None) or getattr(card, "content", None) or "").strip()

def extract_card_answers(card: Any, key: Any) -> list[str]:
    """Extracts a list of non-empty text answers for a given column key or list of keys."""
    if not key:
        default_val = (getattr(card, "explanation", None) or getattr(card, "content", None) or "").strip()
        return [default_val] if default_val else []

    keys = []
    if isinstance(key, (list, tuple, set)):
        keys = [str(k).strip() for k in key if str(k).strip()]
    elif isinstance(key, str):
        if "," in key:
            keys = [k.strip() for k in key.split(",") if k.strip()]
        else:
            keys = [key.strip()]
    else:
        keys = [str(key).strip()]

    results = []
    for k in keys:
        val = extract_card_val(card, k)
        if val and val not in results:
            results.append(val)

    if not results:
        fallback = (getattr(card, "explanation", None) or getattr(card, "content", None) or "").strip()
        if fallback:
            results.append(fallback)

    return results

