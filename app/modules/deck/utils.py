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


def get_enabled_practice_modes(practice_settings: Optional[dict]) -> list[str]:
    """Returns a list of enabled practice mode keys (e.g. ['mcq', 'typing'])."""
    if not practice_settings or not isinstance(practice_settings, dict):
        return []
    try:
        migrated = migrate_practice_settings(practice_settings)
        enabled = []
        for mode_key in ("mcq", "typing", "listening"):
            m = migrated.get(mode_key, {})
            if isinstance(m, dict):
                if m.get("enabled") is False:
                    continue
                pairs = m.get("active_pairs", [])
                if isinstance(pairs, list) and len(pairs) > 0:
                    enabled.append(mode_key)
        return enabled
    except Exception:
        return []


def check_has_practice_setup(practice_settings: Optional[dict]) -> bool:
    return len(get_enabled_practice_modes(practice_settings)) > 0


def check_has_mcq_setup(practice_settings: Optional[dict]) -> bool:
    return "mcq" in get_enabled_practice_modes(practice_settings)


SYSTEM_STUDY_DEFAULTS = {
    "autoplay_audio": "none",       # 'none' | 'front' | 'back' | 'always'
    "show_images": "always",        # 'always' | 'front' | 'back' | 'none'
    "learning_mode": "fsrs",        # 'fsrs' | 'roadmap' | 'new' | 'review' | 'hardest' | 'flip'
    "front_valign": "center",       # 'center' | 'top'
    "front_halign": "left",         # 'left' | 'center'
    "back_valign": "center",        # 'center' | 'top'
    "back_halign": "left",          # 'left' | 'center'
    "random_enabled": False,        # boolean
    "sfx_enabled": True,            # boolean
    "haptic_enabled": True,         # boolean
    "quick_learn_enabled": False,   # boolean
    "show_fsrs": True,              # boolean
    "card_flip_trigger": "both",    # 'both' | 'tap' | 'button_only'
    "card_rating_mode": "both"      # 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way'
}

STUDY_SETTINGS_KEYS = set(SYSTEM_STUDY_DEFAULTS.keys())

SYSTEM_STUDY_PROFILES = [
    {
        "id": "preset-minimal",
        "name": "Minimalist",
        "description": "Zero distractions: no images, no audio autoplay, hidden FSRS metrics, and swipe-only without button clutter.",
        "icon": "sparkles",
        "is_system": True,
        "settings": {
            **SYSTEM_STUDY_DEFAULTS,
            "learning_mode": "fsrs",
            "autoplay_audio": "none",
            "show_images": "none",
            "show_fsrs": False,
            "card_flip_trigger": "tap",
            "card_rating_mode": "swipe_4way",
            "sfx_enabled": False,
            "haptic_enabled": False,
            "random_enabled": False
        }
    },
    {
        "id": "preset-full",
        "name": "Full Experience",
        "description": "All features enabled: dual-sided images, autoplay TTS audio, FSRS metrics, and combined swipe & buttons.",
        "icon": "zap",
        "is_system": True,
        "settings": {
            **SYSTEM_STUDY_DEFAULTS,
            "learning_mode": "fsrs",
            "autoplay_audio": "always",
            "show_images": "both",
            "show_fsrs": True,
            "card_flip_trigger": "both",
            "card_rating_mode": "both",
            "sfx_enabled": True,
            "haptic_enabled": True,
            "random_enabled": False
        }
    },
    {
        "id": "preset-standard",
        "name": "Standard",
        "description": "Balanced recall: clean question on the front side; audio pronunciation and illustration appear only on the back side.",
        "icon": "sparkles",
        "is_system": True,
        "settings": {
            **SYSTEM_STUDY_DEFAULTS,
            "learning_mode": "fsrs",
            "autoplay_audio": "back",
            "show_images": "back_only",
            "show_fsrs": True,
            "card_flip_trigger": "both",
            "card_rating_mode": "both",
            "sfx_enabled": True,
            "haptic_enabled": True,
            "random_enabled": False
        }
    },
    {
        "id": "preset-classic",
        "name": "Classic",
        "description": "Traditional 4-button workflow: flip strictly via button so you can easily select and copy text without accidental flips.",
        "icon": "book",
        "is_system": True,
        "settings": {
            **SYSTEM_STUDY_DEFAULTS,
            "learning_mode": "fsrs",
            "autoplay_audio": "back",
            "show_images": "both",
            "show_fsrs": True,
            "card_flip_trigger": "button_only",
            "card_rating_mode": "buttons",
            "sfx_enabled": True,
            "haptic_enabled": True,
            "front_valign": "top",
            "front_halign": "left",
            "back_valign": "top",
            "back_halign": "left",
            "random_enabled": False
        }
    }
]

def get_all_study_profiles(custom_profiles: Optional[list] = None) -> list[dict]:
    profiles = [dict(p) for p in SYSTEM_STUDY_PROFILES]
    if custom_profiles and isinstance(custom_profiles, list):
        for cp in custom_profiles:
            if isinstance(cp, dict) and cp.get("id"):
                profiles.append(cp)
    return profiles


def normalize_study_setting_value(key: str, val: Any) -> Any:
    if val is None:
        return None
    if key == "card_flip_trigger":
        val_str = str(val).lower().strip()
        if val_str in ("tap", "chạm"): return "tap"
        if val_str in ("button_only", "button", "nút"): return "button_only"
        return "both"
    if key == "card_rating_mode":
        val_str = str(val).lower().strip()
        if val_str in ("buttons", "button", "nút"): return "buttons"
        if val_str in ("swipe_4way", "4way", "4 hướng", "vuốt 4 hướng"): return "swipe_4way"
        if val_str in ("swipe_2way", "2way", "vuốt 2 hướng"): return "swipe_2way"
        return "both"
    if key in ("front_valign", "back_valign"):
        val_str = str(val).lower().strip()
        if val_str in ("top", "đỉnh", "trên", "start", "flex-start"):
            return "top"
        return "center"
    if key in ("front_halign", "back_halign"):
        val_str = str(val).lower().strip()
        if val_str in ("center", "giữa", "giua", "centre"):
            return "center"
        return "left"
    if key == "autoplay_audio":
        val_str = str(val).lower().strip()
        if val_str in ("never", "off", "disabled", "none", "false", "tắt", "không", "ko"):
            return "none"
        if val_str in ("both", "always", "all", "true", "cả hai", "hai mặt", "luôn bật"):
            return "always"
        if val_str in ("front", "mặt trước", "truoc"):
            return "front"
        if val_str in ("back", "mặt sau", "sau"):
            return "back"
        return "none"
    if key == "show_images":
        val_str = str(val).lower().strip()
        if val_str in ("never", "off", "none", "false", "hidden", "ẩn", "tắt", "không"):
            return "none"
        if val_str in ("both", "always", "true", "luôn hiện", "hiện", "bật"):
            return "always"
        if val_str in ("front", "mặt trước", "truoc"):
            return "front"
        if val_str in ("back", "mặt sau", "sau", "chỉ mặt sau"):
            return "back"
        return "always"
    if key in ("random_enabled", "sfx_enabled", "haptic_enabled", "quick_learn_enabled", "show_fsrs"):
        if isinstance(val, bool):
            return val
        val_str = str(val).lower().strip()
        if val_str in ("true", "1", "yes", "bật", "có", "on", "enable", "enabled"):
            return True
        if val_str in ("false", "0", "no", "tắt", "không", "ko", "off", "disable", "disabled"):
            return False
        return bool(val)
    if key == "learning_mode":
        val_str = str(val).lower().strip()
        if val_str in ("fsrs", "roadmap", "new", "review", "hardest", "flip", "mcq", "typing", "listening"):
            return val_str
        if val_str in ("trắc nghiệm", "trac nghiem", "quiz"):
            return "mcq"
        if val_str in ("gõ", "go", "type"):
            return "typing"
        if val_str in ("nghe", "luyện nghe", "luyen nghe", "listen"):
            return "listening"
        if val_str in ("lộ trình", "road map"):
            return "roadmap"
        if val_str in ("từ mới", "mới"):
            return "new"
        if val_str in ("ôn tập", "ôn"):
            return "review"
        if val_str in ("khó nhất", "từ khó"):
            return "hardest"
        if val_str in ("lật thẻ", "lật"):
            return "flip"
        return "fsrs"
    return val


def resolve_effective_study_settings(
    deck_practice_settings: Optional[dict] = None,
    user_deck_settings: Optional[dict] = None,
    user_global_settings: Optional[dict] = None
) -> dict:
    """
    Resolves study settings using 3-tier hierarchy:
    Tier 1 (Base): Creator Deck Defaults (deck.practice_settings.study_defaults)
    Tier 2 (User Default): User Global Account Settings (user_global_settings)
    Tier 3 (King / Highest): User Deck Overrides (UserDeckSettings.settings)
    """
    creator_defaults = {}
    if deck_practice_settings and isinstance(deck_practice_settings, dict):
        raw_cd = deck_practice_settings.get("study_defaults")
        if isinstance(raw_cd, dict):
            for k in STUDY_SETTINGS_KEYS:
                if k in raw_cd and raw_cd[k] is not None:
                    norm = normalize_study_setting_value(k, raw_cd[k])
                    if norm is not None:
                        creator_defaults[k] = norm
        # Top-level keys in deck.practice_settings take precedence over nested study_defaults
        for k in STUDY_SETTINGS_KEYS:
            if k in deck_practice_settings and deck_practice_settings[k] is not None:
                norm = normalize_study_setting_value(k, deck_practice_settings[k])
                if norm is not None:
                    creator_defaults[k] = norm

    global_defaults = {}
    if user_global_settings and isinstance(user_global_settings, dict):
        for k in STUDY_SETTINGS_KEYS:
            if k in user_global_settings and user_global_settings[k] is not None:
                norm = normalize_study_setting_value(k, user_global_settings[k])
                if norm is not None:
                    global_defaults[k] = norm

    user_overrides = {}
    if user_deck_settings and isinstance(user_deck_settings, dict):
        # 1. Fallback: check legacy nested study_settings if present
        raw_ud = user_deck_settings.get("study_settings")
        if isinstance(raw_ud, dict):
            for k in STUDY_SETTINGS_KEYS:
                if k in raw_ud and raw_ud[k] is not None:
                    norm = normalize_study_setting_value(k, raw_ud[k])
                    if norm is not None:
                        user_overrides[k] = norm
        # 2. Top-level keys in user_deck_settings ALWAYS take precedence over nested legacy settings!
        for k in STUDY_SETTINGS_KEYS:
            if k in user_deck_settings and user_deck_settings[k] is not None:
                norm = normalize_study_setting_value(k, user_deck_settings[k])
                if norm is not None:
                    user_overrides[k] = norm

    # Merge: System Defaults <- Creator Defaults <- User Overrides
    effective = dict(SYSTEM_STUDY_DEFAULTS)
    effective.update(creator_defaults)
    effective.update(user_overrides)

    is_customized = len(user_overrides) > 0
    
    # Determine setting origin
    if is_customized:
        raw_origin = user_deck_settings.get("_origin") if isinstance(user_deck_settings, dict) else None
        setting_origin = raw_origin if raw_origin else "deck_override"
    else:
        setting_origin = "deck_default"

    custom_profiles = user_global_settings.get("study_profiles", []) if isinstance(user_global_settings, dict) else []
    study_profiles = get_all_study_profiles(custom_profiles)
    active_profile_id = user_global_settings.get("active_profile_id") if isinstance(user_global_settings, dict) else None

    return {
        "effective_study_settings": effective,
        "creator_study_defaults": creator_defaults,
        "user_study_settings": user_overrides,
        "user_global_settings": global_defaults,
        "study_profiles": study_profiles,
        "active_profile_id": active_profile_id,
        "setting_origin": setting_origin,
        "is_customized": is_customized
    }



