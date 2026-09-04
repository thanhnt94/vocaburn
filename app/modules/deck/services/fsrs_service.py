from datetime import datetime, timezone

def apply_stability_boost(card_copy, rating_val, scheduler) -> float:
    from fsrs import State
    stability = card_copy.stability
    if stability is None or card_copy.state != State.Review:
        return stability

    try:
        r_val = int(rating_val)
    except (TypeError, ValueError):
        r_val = 3

    float_interval_days = (stability / scheduler._FACTOR) * (
        (scheduler.desired_retention ** (1 / scheduler._DECAY)) - 1
    )

    if float_interval_days < 1.0 and r_val > 1:
        boost_map = {2: 2.0, 3: 3.5, 4: 5.0}
        boost_factor = boost_map.get(r_val, 1.0)
        stability = stability * boost_factor
        min_stability = 0.2
        if stability < min_stability:
            stability = min_stability

    return stability

def estimate_intervals(scheduler, card, now_utc) -> dict:
    from fsrs import Rating, State
    intervals = {}
    for r_val, r_enum in [(1, Rating.Again), (2, Rating.Hard), (3, Rating.Good), (4, Rating.Easy)]:
        try:
            card_copy, _ = scheduler.review_card(card, r_enum, now_utc)
            if card_copy.state == State.Review:
                card_copy.stability = apply_stability_boost(card_copy, r_val, scheduler)
                float_interval_days = (card_copy.stability / scheduler._FACTOR) * (
                    (scheduler.desired_retention ** (1 / scheduler._DECAY)) - 1
                )
                float_interval_days = min(float_interval_days, float(scheduler.maximum_interval))
                float_interval_days = max(float_interval_days, 0.0)
                
                if float_interval_days < 1.0:
                    total_seconds = float_interval_days * 86400
                    if total_seconds < 60:
                        intervals[r_val] = "1m"
                    elif total_seconds < 3600:
                        intervals[r_val] = f"{int(total_seconds / 60)}m"
                    else:
                        hours = int(total_seconds / 3600)
                        mins = int((total_seconds % 3600) / 60)
                        if mins > 0:
                            intervals[r_val] = f"{hours}h {mins}m"
                        else:
                            intervals[r_val] = f"{hours}h"
                else:
                    days = int(float_interval_days)
                    hours = int((float_interval_days - days) * 24)
                    if hours > 0:
                        intervals[r_val] = f"{days}d {hours}h"
                    else:
                        intervals[r_val] = f"{days}d"
            else:
                delta = card_copy.due - now_utc
                if delta.total_seconds() < 60:
                    intervals[r_val] = "1m"
                elif delta.total_seconds() < 3600:
                    intervals[r_val] = f"{int(delta.total_seconds() / 60)}m"
                elif delta.total_seconds() < 86400:
                    intervals[r_val] = f"{int(delta.total_seconds() / 3600)}h"
                else:
                    intervals[r_val] = f"{int(delta.total_seconds() / 86400)}d"
        except Exception:
            intervals[r_val] = "?"
    return intervals

def build_fsrs_card(mastery, now_utc):
    from fsrs import Card, State
    state_map = {
        0: State.Learning,
        1: State.Learning,
        2: State.Review,
        3: State.Relearning
    }
    card_state = state_map.get(mastery.state if mastery else 0, State.Learning)
    if card_state in (State.Review, State.Relearning) and (not mastery or mastery.stability is None or mastery.difficulty is None):
        card_state = State.Learning
        
    fsrs_card = Card()
    if mastery:
        fsrs_card.state = card_state
        fsrs_card.step = mastery.step
        fsrs_card.stability = mastery.stability
        fsrs_card.difficulty = mastery.difficulty
        fsrs_card.due = mastery.due.replace(tzinfo=timezone.utc) if mastery.due else now_utc
        fsrs_card.last_review = mastery.last_review.replace(tzinfo=timezone.utc) if mastery.last_review else None
    else:
        fsrs_card.state = State.Learning
        fsrs_card.step = 0
        fsrs_card.stability = None
        fsrs_card.difficulty = None
        fsrs_card.due = now_utc
        fsrs_card.last_review = None
    return fsrs_card
