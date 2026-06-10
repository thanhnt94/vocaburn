from fsrs import Card, Scheduler, Rating, State
from datetime import datetime, timezone, timedelta

def apply_stability_boost(card_copy, rating_val, scheduler) -> float:
    from fsrs import State
    stability = card_copy.stability
    if stability is None or card_copy.state != State.Review:
        return stability

    try:
        r_val = int(rating_val)
    except (TypeError, ValueError):
        r_val = 3

    # Calculate float_interval_days using the current stability
    float_interval_days = (stability / scheduler._FACTOR) * (
        (scheduler.desired_retention ** (1 / scheduler._DECAY)) - 1
    )

    if float_interval_days < 1.0 and r_val > 1:
        boost_map = {
            2: 2.0,
            3: 3.5,
            4: 5.0
        }
        boost_factor = boost_map.get(r_val, 1.0)
        stability = stability * boost_factor

        min_stability = 0.2
        if stability < min_stability:
            stability = min_stability

    return stability

def test_existing_review_progression():
    s = Scheduler(enable_fuzzing=False)
    now = datetime.now(timezone.utc)
    
    # Let's say a card is in Review state with stability = 0.05 days (~1.2 hours).
    # Its last review was 1.2 hours ago.
    last_review = now - timedelta(hours=1.2)
    c = Card(
        state=State.Review, 
        stability=0.05, 
        difficulty=5.0, 
        due=now,
        last_review=last_review
    )
    
    print("Initial Existing Review Card:")
    print(f"  Stability: {c.stability:.4f}")
    
    # 1. User reviews Good (Rating.Good = 3)
    cg, _ = s.review_card(c, Rating.Good, now)
    print("\nAfter Review (Good) without boost:")
    print(f"  Stability: {cg.stability:.4f}")
    
    # Apply boost
    boosted_stability = apply_stability_boost(cg, 3, s)
    cg.stability = boosted_stability
    print("After Review (Good) WITH boost:")
    print(f"  Stability: {cg.stability:.4f}")
    
    float_interval_days = (cg.stability / s._FACTOR) * (
        (s.desired_retention ** (1 / s._DECAY)) - 1
    )
    print(f"  Boosted Interval (hours): {float_interval_days * 24:.2f}")

    # 2. Next review (User reviews Good again) after the boosted interval (e.g. ~4.2 hours)
    next_time = now + timedelta(days=float_interval_days)
    cg.last_review = now
    
    cg2, _ = s.review_card(cg, Rating.Good, next_time)
    print("\nSecond Review (Good) without boost:")
    print(f"  Stability: {cg2.stability:.4f}")
    
    boosted_stability2 = apply_stability_boost(cg2, 3, s)
    cg2.stability = boosted_stability2
    print("Second Review (Good) WITH boost:")
    print(f"  Stability: {cg2.stability:.4f}")
    
    float_interval_days2 = (cg2.stability / s._FACTOR) * (
        (s.desired_retention ** (1 / s._DECAY)) - 1
    )
    print(f"  Boosted Interval 2 (days): {float_interval_days2:.2f}")

if __name__ == '__main__':
    test_existing_review_progression()
