from typing import Optional, Any, Union, Set, List, Dict
import logging

logger = logging.getLogger(__name__)

def clean_col_name(name: Any) -> str:
    """
    Cleans up column names:
    - Unwraps outer brackets '[' ... ']' or '(' ... ')'
    - Unwraps outer quotes "'" or '"'
    - Strips whitespace
    """
    if name is None:
        return ""
    s = str(name).strip()
    # Handle list or tuple directly
    if isinstance(name, (list, tuple)):
        return clean_col_name(name[0]) if name else ""
    # Unwrap stringified lists or tuples: e.g. "['front']" or "('front')"
    while (s.startswith("[") and s.endswith("]")) or (s.startswith("(") and s.endswith(")")):
        s = s[1:-1].strip()
    while (s.startswith("'") and s.endswith("'")) or (s.startswith('"') and s.endswith('"')):
        s = s[1:-1].strip()
    return s.strip()

def reconcile_column_name(target_col: Any, available_cols: Union[Set[str], List[str]]) -> str:
    """
    Reconciles a column name (which might be a template placeholder like 'nghĩa',
    'phiên âm quốc tế (ipa)', or a stringified list like "['front']") against the actual
    columns available in the deck.
    """
    if not target_col:
        return "front"
        
    s = clean_col_name(target_col)
    if not s:
        return "front"

    avail_lower = {str(c).strip().lower(): str(c).strip() for c in available_cols if c}
    s_lower = s.lower()

    # 1. Exact match (case-insensitive)
    if s_lower in avail_lower:
        return avail_lower[s_lower]

    # 2. Semantic group mapping
    # Meaning / Nghĩa
    if s_lower in ("nghĩa", "nghia", "meaning", "definition", "định nghĩa", "dinh nghia"):
        # Prioritize exact "nghĩa tiếng việt"
        for candidate in ("nghĩa tiếng việt", "nghia tieng viet", "tiếng việt", "tieng viet"):
            if candidate in avail_lower:
                return avail_lower[candidate]
        for k_l, orig in avail_lower.items():
            if "nghĩa" in k_l or "nghia" in k_l:
                return orig
        if "back" in avail_lower:
            return "back"
        if "explanation" in avail_lower:
            return "explanation"

    # Pronunciation / IPA
    if "ipa" in s_lower or "quốc tế" in s_lower or "quoc te" in s_lower:
        for candidate in ("phiên âm ipa", "phien am ipa", "phiên âm quốc tế (ipa)", "ipa"):
            if candidate in avail_lower:
                return avail_lower[candidate]
        for k_l, orig in avail_lower.items():
            if "ipa" in k_l:
                return orig

    # Pronunciation / Vietnamese Reading / Bồi
    if "tiếng việt" in s_lower or "bồi" in s_lower or "cách đọc" in s_lower or "boi" in s_lower:
        for candidate in ("cách đọc (bồi tiếng việt)", "cách đọc bồi", "phiên âm tiếng việt", "bồi tiếng việt", "bồi", "cách đọc"):
            if candidate in avail_lower:
                return avail_lower[candidate]
        for k_l, orig in avail_lower.items():
            if "bồi" in k_l or "cách đọc" in k_l:
                return orig

    # Word / Front / Term
    if s_lower in ("từ mới", "tu moi", "từ", "tu", "từ vựng", "tu vung", "term", "word"):
        for candidate in ("từ mới", "tu moi", "từ vựng", "tu vung", "front"):
            if candidate in avail_lower:
                return avail_lower[candidate]

    # Part of speech / Loại từ
    if s_lower in ("loại từ", "loai tu", "pos", "part of speech"):
        for candidate in ("loại từ", "loai tu", "pos"):
            if candidate in avail_lower:
                return avail_lower[candidate]

    # Substring matching (e.g. "nghĩa" is inside "nghĩa tiếng việt")
    for k_l, orig in avail_lower.items():
        if s_lower in k_l and k_l not in ("front", "back", "id", "order_in_container"):
            return orig
    for k_l, orig in avail_lower.items():
        if k_l in s_lower and k_l not in ("front", "back", "id", "order_in_container"):
            return orig

    # Return original cleaned name
    return s

def reconcile_practice_pairs(settings_dict: dict, available_cols: Union[Set[str], List[str]]) -> bool:
    """
    Traverses active_pairs across practice modes and reconciles every question/answer column
    against actual available columns. Returns True if any pair was modified.
    """
    if not settings_dict or not isinstance(settings_dict, dict):
        return False
        
    modified = False
    for mode in ("mcq", "typing", "listening", "listening_mcq", "listening_typing", "audio_mcq", "audio_typing"):
        mode_cfg = settings_dict.get(mode)
        if not mode_cfg or not isinstance(mode_cfg, dict):
            continue
        pairs = mode_cfg.get("active_pairs")
        if not pairs or not isinstance(pairs, list):
            continue
            
        for pair in pairs:
            if not isinstance(pair, dict):
                continue
            orig_q = pair.get("q") or pair.get("prompt_col") or "front"
            orig_a = pair.get("a") if pair.get("a") is not None else pair.get("answer_col", "back")
            
            rec_q = reconcile_column_name(orig_q, available_cols)
            if isinstance(orig_a, list):
                rec_a = [reconcile_column_name(item, available_cols) for item in orig_a]
                if len(rec_a) == 1:
                    rec_a = rec_a[0]
            else:
                rec_a = clean_col_name(orig_a)
                if rec_a.startswith("[") or rec_a.endswith("]"):
                    rec_a = clean_col_name(rec_a)
                rec_a = reconcile_column_name(rec_a, available_cols)
                
            if rec_q != orig_q or rec_a != orig_a:
                modified = True
                pair["q"] = rec_q
                pair["prompt_col"] = rec_q
                pair["a"] = rec_a
                pair["answer_col"] = rec_a
                display_a = "/".join(rec_a) if isinstance(rec_a, list) else str(rec_a)
                pair["name"] = f"{rec_q} ➜ {display_a}"
                
    return modified

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
    """Normalizes legacy practice settings into structured mcq, typing, listening_mcq, listening_typing config dict."""
    if not settings:
        return {}
    new_settings = dict(settings)
    active_pairs = settings.get("active_pairs", [])
    num_choices = settings.get("num_choices", 4)
    if "mcq" not in new_settings:
        new_settings["mcq"] = {"active_pairs": active_pairs, "num_choices": num_choices}
    if "typing" not in new_settings:
        new_settings["typing"] = {"active_pairs": active_pairs}
    
    # Listening migration: support listening_mcq and listening_typing
    old_listening = settings.get("listening", {})
    l_pairs = old_listening.get("active_pairs") if isinstance(old_listening, dict) else active_pairs
    l_num_choices = old_listening.get("num_choices", 4) if isinstance(old_listening, dict) else num_choices
    
    if "listening_mcq" not in new_settings:
        new_settings["listening_mcq"] = {"active_pairs": l_pairs or active_pairs, "num_choices": l_num_choices}
    if "listening_typing" not in new_settings:
        new_settings["listening_typing"] = {"active_pairs": l_pairs or active_pairs}
    if "listening" not in new_settings:
        new_settings["listening"] = {"active_pairs": l_pairs or active_pairs, "num_choices": l_num_choices}
    return new_settings

def extract_card_val(card: Any, key: Optional[str]) -> str:
    """Extracts text content for a given column key from a Flashcard object."""
    if not key:
        return (getattr(card, "content", None) or "").strip()
    lower_key = str(key).strip().lower()

    # 1. Check card.others dict FIRST for custom column keys
    if hasattr(card, "others") and card.others and isinstance(card.others, dict):
        if key in card.others:
            val = card.others.get(key)
            if val is not None and str(val).strip():
                return str(val).strip()
        for k, v in card.others.items():
            if str(k).strip().lower() == lower_key and v is not None and str(v).strip():
                return str(v).strip()
        # Semantic match for meaning / nghĩa (e.g. key is "nghĩa", others has "nghĩa tiếng việt")
        if lower_key in ("nghĩa", "meaning") or "nghĩa" in lower_key or "mean" in lower_key:
            for k, v in card.others.items():
                k_lower = str(k).lower()
                if ("nghĩa" in k_lower or "mean" in k_lower) and v is not None and str(v).strip():
                    return str(v).strip()
        # Semantic match for ipa / phiên âm
        if "ipa" in lower_key or "phiên âm" in lower_key or "phát âm" in lower_key:
            for k, v in card.others.items():
                k_lower = str(k).lower()
                if ("ipa" in k_lower or "phiên âm" in k_lower or "phát âm" in k_lower) and v is not None and str(v).strip():
                    return str(v).strip()

    if key in ("front", "content"):
        return (getattr(card, "content", None) or "").strip()
    if key in ("back", "explanation"):
        return (getattr(card, "explanation", None) or "").strip()
    if hasattr(card, key):
        val = getattr(card, key)
        if val is not None and str(val).strip():
            return str(val).strip()

    # Fallback with tag extraction for nghĩa/meaning
    exp = getattr(card, "explanation", None) or getattr(card, "content", None) or ""
    exp_str = str(exp).strip()
    if lower_key in ("nghĩa", "meaning") or "nghĩa" in lower_key or "mean" in lower_key:
        import re
        tag_m = re.search(r'🏷️\s*([^\n🌱💡📢📌📝🗣️]+)', exp_str)
        if tag_m and tag_m.group(1).strip():
            return tag_m.group(1).strip()
        bulb_m = re.search(r'💡\s*([^\n🌱📢📌📝🗣️🏷️]+)', exp_str)
        if bulb_m and bulb_m.group(1).strip():
            return bulb_m.group(1).strip()

    return exp_str

def extract_card_answers(card: Any, key: Any) -> list[str]:
    """Extracts a list of non-empty text answers for a given column key or list of keys, supporting '|' delimiter."""
    if not key:
        default_val = (getattr(card, "explanation", None) or getattr(card, "content", None) or "").strip()
        if not default_val:
            return []
        if "|" in default_val:
            return [p.strip() for p in default_val.split("|") if p.strip()]
        return [default_val]

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
        if val:
            if "|" in val:
                for sub in val.split("|"):
                    sub_clean = sub.strip()
                    if sub_clean and sub_clean not in results:
                        results.append(sub_clean)
            elif val not in results:
                results.append(val)

    if not results:
        fallback = (getattr(card, "explanation", None) or getattr(card, "content", None) or "").strip()
        if fallback:
            if "|" in fallback:
                for sub in fallback.split("|"):
                    sub_clean = sub.strip()
                    if sub_clean and sub_clean not in results:
                        results.append(sub_clean)
            else:
                results.append(fallback)

    return results


def get_enabled_practice_modes(practice_settings: Optional[dict]) -> list[str]:
    """Returns a list of enabled practice mode keys (e.g. ['mcq', 'typing', 'listening_mcq', 'listening_typing'])."""
    if not practice_settings or not isinstance(practice_settings, dict):
        return []
    try:
        migrated = migrate_practice_settings(practice_settings)
        enabled = []
        for mode_key in ("mcq", "typing", "listening", "listening_mcq", "listening_typing"):
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
    "learning_mode": "fsrs",        # 'fsrs' | 'roadmap' | 'new' | 'review' | 'hardest' | 'flip' | 'speed_skim'
    "front_valign": "center",       # 'center' | 'top'
    "front_halign": "left",         # 'left' | 'center'
    "front_font_size": "100%",      # '85%' | '100%' | '125%' | '150%' | '175%' | '200%'
    "back_valign": "center",        # 'center' | 'top'
    "back_halign": "left",          # 'left' | 'center'
    "back_font_size": "100%",       # '85%' | '100%' | '125%' | '150%' | '175%' | '200%'
    "random_enabled": False,        # boolean
    "sfx_enabled": True,            # boolean
    "haptic_enabled": True,         # boolean
    "quick_learn_enabled": False,   # boolean
    "auto_next_delay": 0,           # Optional[int]: 0 (off), 1, 2, 3...
    "show_fsrs": True,              # boolean
    "card_flip_trigger": "both",    # 'both' | 'tap' | 'button_only'
    "card_rating_mode": "both",     # 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way'
    "show_action_dock": True,       # boolean
    "swipe_to_rate": True,          # boolean
    "show_bottom_nav_tabs": False,  # boolean: Show 3-tab bar (Map, Card, Stats) at bottom on mobile
    "audio_speed": 1.0,             # float
    "flip_sides": False             # boolean
}

STUDY_SETTINGS_KEYS = set(SYSTEM_STUDY_DEFAULTS.keys())

SYSTEM_STUDY_PROFILES = [
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
            "random_enabled": False,
            "auto_next_delay": 0,
            "quick_learn_enabled": False
        }
    },
    {
        "id": "preset-speed-skim",
        "name": "Speed Skim",
        "description": "High-speed rapid review: 1-tap/Space flip & next, hidden FSRS ratings, zero rating friction.",
        "icon": "zap",
        "is_system": True,
        "settings": {
            **SYSTEM_STUDY_DEFAULTS,
            "learning_mode": "speed_skim",
            "autoplay_audio": "front",
            "show_images": "both",
            "show_fsrs": False,
            "card_flip_trigger": "both",
            "card_rating_mode": "buttons",
            "sfx_enabled": True,
            "haptic_enabled": True,
            "random_enabled": False,
            "quick_learn_enabled": False,
            "auto_next_delay": 0
        }
    },
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
            "random_enabled": False,
            "auto_next_delay": 0,
            "quick_learn_enabled": False
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
            "random_enabled": False,
            "auto_next_delay": 0,
            "quick_learn_enabled": False
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

CACHED_SYSTEM_STUDY_PROFILES: list[dict] = list(SYSTEM_STUDY_PROFILES)

def get_system_study_profiles() -> list[dict]:
    global CACHED_SYSTEM_STUDY_PROFILES
    return CACHED_SYSTEM_STUDY_PROFILES if CACHED_SYSTEM_STUDY_PROFILES else list(SYSTEM_STUDY_PROFILES)

def set_cached_system_study_profiles(profiles: list[dict]) -> None:
    global CACHED_SYSTEM_STUDY_PROFILES
    if profiles and isinstance(profiles, list):
        CACHED_SYSTEM_STUDY_PROFILES = list(profiles)

def get_all_study_profiles(custom_profiles: Optional[list] = None) -> list[dict]:
    seen_ids = set()
    profiles = []
    
    # 1. Base system presets first
    for p in get_system_study_profiles():
        pid = p.get("id")
        if pid and pid not in seen_ids:
            seen_ids.add(pid)
            profiles.append(dict(p))

    # 2. User custom profiles (deduplicated, never re-adding system presets)
    if custom_profiles and isinstance(custom_profiles, list):
        for cp in custom_profiles:
            if isinstance(cp, dict) and cp.get("id"):
                pid = cp.get("id")
                if pid not in seen_ids and not cp.get("is_system") and not str(pid).startswith("preset-"):
                    seen_ids.add(pid)
                    profiles.append(dict(cp))
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
    if key == "front_font_size":
        if val is None:
            return "100%"
        val_str = str(val).lower().strip()
        if val_str in ("compact", "nhỏ", "nho", "small"): return "85%"
        if val_str in ("normal", "mặc định", "mac dinh", "vừa", "vua", "default", "standard"): return "100%"
        if val_str in ("large", "to", "lớn", "lon"): return "125%"
        if val_str in ("xlarge", "xl", "to hơn", "to hon", "extra_large"): return "150%"
        if val_str in ("huge", "cực to", "cuc to", "rất to", "rat to", "xxl"): return "175%"
        if val_str in ("massive", "tối đa", "max"): return "200%"
        clean_num = val_str.replace("%", "").strip()
        try:
            num = int(float(clean_num))
            if num < 50: num = 50
            if num > 250: num = 250
            return f"{num}%"
        except Exception:
            return "100%"
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
    if key in ("random_enabled", "sfx_enabled", "haptic_enabled", "quick_learn_enabled", "show_fsrs", "show_action_dock", "swipe_to_rate", "show_bottom_nav_tabs"):
        if isinstance(val, bool):
            return val
        val_str = str(val).lower().strip()
        if val_str in ("true", "1", "yes", "bật", "có", "on", "enable", "enabled"):
            return True
        if val_str in ("false", "0", "no", "tắt", "không", "ko", "off", "disable", "disabled"):
            return False
        return bool(val)
    if key == "auto_next_delay":
        if val is None:
            return None
        try:
            val_int = int(float(val))
            return max(0, min(10, val_int))
        except Exception:
            return None
    if key == "learning_mode":
        val_str = str(val).lower().strip()
        if val_str in ("fsrs", "roadmap", "new", "review", "hardest", "flip", "mcq", "typing", "listening", "skim", "speed_skim"):
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
        if val_str in ("lật thẻ", "lật", "lướt", "luot", "speed skim"):
            return "skim"
        if val_str in ("memrise", "gieo hạt", "gieo hat", "tưới cây", "tuoi cay"):
            return "fsrs"
        return "fsrs"
    return val


def resolve_effective_study_settings(
    deck_practice_settings: Any = None,
    user_deck_settings: Any = None,
    user_global_settings: Any = None
) -> dict:
    """
    Resolves study settings using strictly a 2-tier hierarchy:
    Tier 1 (Base): Creator Deck Defaults (deck.practice_settings.study_defaults)
    Tier 2 (King / Highest): Learner Deck Overrides (UserDeckSettings.settings)
    There are NO global user defaults for deck study settings.
    """
    import json
    if hasattr(deck_practice_settings, "practice_settings"):
        deck_practice_settings = deck_practice_settings.practice_settings
    if hasattr(user_deck_settings, "settings"):
        user_deck_settings = user_deck_settings.settings

    if isinstance(deck_practice_settings, str):
        try:
            deck_practice_settings = json.loads(deck_practice_settings)
        except Exception:
            deck_practice_settings = None
    if isinstance(user_deck_settings, str):
        try:
            user_deck_settings = json.loads(user_deck_settings)
        except Exception:
            user_deck_settings = None

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

    # Keep card_rating_mode, show_action_dock, and swipe_to_rate harmonized in user overrides
    if "card_rating_mode" in user_overrides:
        crm = user_overrides["card_rating_mode"]
        if crm == "buttons":
            if "show_action_dock" not in user_overrides: user_overrides["show_action_dock"] = True
            if "swipe_to_rate" not in user_overrides: user_overrides["swipe_to_rate"] = False
        elif crm in ("swipe_4way", "swipe_2way"):
            if "show_action_dock" not in user_overrides: user_overrides["show_action_dock"] = False
            if "swipe_to_rate" not in user_overrides: user_overrides["swipe_to_rate"] = True
        elif crm == "both":
            if "show_action_dock" not in user_overrides: user_overrides["show_action_dock"] = True
            if "swipe_to_rate" not in user_overrides: user_overrides["swipe_to_rate"] = True
    elif "show_action_dock" in user_overrides or "swipe_to_rate" in user_overrides:
        sad = user_overrides.get("show_action_dock", True)
        str_val = user_overrides.get("swipe_to_rate", True)
        if sad and str_val:
            user_overrides["card_rating_mode"] = "both"
        elif sad:
            user_overrides["card_rating_mode"] = "buttons"
        elif str_val:
            user_overrides["card_rating_mode"] = "swipe_4way"

    # Merge: System Defaults <- Creator Defaults <- User Overrides
    effective = dict(SYSTEM_STUDY_DEFAULTS)
    effective.update(creator_defaults)
    effective.update(user_overrides)

    # Re-harmonize effective rating controls
    eff_crm = effective.get("card_rating_mode", "both")
    if eff_crm == "buttons":
        effective["show_action_dock"] = True
        effective["swipe_to_rate"] = False
    elif eff_crm in ("swipe_4way", "swipe_2way"):
        effective["show_action_dock"] = False
        effective["swipe_to_rate"] = True
    elif eff_crm == "both":
        effective["show_action_dock"] = True
        effective["swipe_to_rate"] = True

    is_customized = len(user_overrides) > 0
    
    # Determine setting origin
    if is_customized:
        raw_origin = user_deck_settings.get("_origin") if isinstance(user_deck_settings, dict) else None
        setting_origin = raw_origin if raw_origin else "deck_override"
    else:
        setting_origin = "deck_default"

    res = {
        "effective_study_settings": effective,
        "creator_study_defaults": creator_defaults,
        "user_study_settings": user_overrides,
        "user_global_settings": {},
        "study_profiles": [],
        "active_profile_id": None,
        "setting_origin": setting_origin,
        "is_customized": is_customized
    }
    res.update(effective)
    return res



