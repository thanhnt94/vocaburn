import time
from typing import Dict, Optional, Tuple
from datetime import datetime

class PresenceTracker:
    # In-memory store: user_id -> unix_timestamp
    _last_seen: Dict[int, float] = {}

    @classmethod
    def touch(cls, user_id: int):
        if user_id:
            try:
                cls._last_seen[int(user_id)] = time.time()
            except (ValueError, TypeError):
                pass

    @classmethod
    def get_last_seen_ts(cls, user_id: int, db_last_activity: Optional[datetime] = None) -> Optional[float]:
        try:
            uid = int(user_id)
        except (ValueError, TypeError):
            return None

        mem_ts = cls._last_seen.get(uid)
        db_ts = db_last_activity.timestamp() if db_last_activity else None
        
        if mem_ts is not None and db_ts is not None:
            return max(mem_ts, db_ts)
        return mem_ts if mem_ts is not None else db_ts

    @classmethod
    def get_status_info(cls, user_id: int, db_last_activity: Optional[datetime] = None) -> Tuple[str, str]:
        """
        Determines user activity status:
          - 'online': active within last 5 minutes (<= 300s)
          - 'away': active within last 30 minutes (<= 1800s)
          - 'offline': inactive > 30 minutes
        Returns:
            (status, label)
            status: 'online' | 'away' | 'offline'
            label: 'Active now' | '5m ago' | 'Offline' etc.
        """
        ts = cls.get_last_seen_ts(user_id, db_last_activity)
        if not ts:
            return "offline", "Offline"

        now = time.time()
        diff = max(0.0, now - ts)

        if diff <= 300:  # <= 5 minutes
            return "online", "Active now"
        elif diff <= 1800:  # <= 30 minutes
            mins = max(1, int(diff / 60))
            return "away", f"{mins}m ago"
        elif diff <= 86400:  # <= 24 hours
            hours = max(1, int(diff / 3600))
            return "offline", f"{hours}h ago"
        elif diff <= 2592000:  # <= 30 days
            days = max(1, int(diff / 86400))
            return "offline", f"{days}d ago"
        elif diff <= 31536000:  # <= 365 days
            months = max(1, int(diff / 2592000))
            return "offline", f"{months}mo ago"
        else:
            years = max(1, int(diff / 31536000))
            return "offline", f"{years}y ago"
