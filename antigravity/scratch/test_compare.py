from fsrs import Card, Scheduler, Rating, State
from datetime import datetime, timezone

def test():
    s = Scheduler()
    now = datetime.now(timezone.utc)
    
    # Method A: constructor
    c1 = Card(state=State.Learning, step=1, stability=0.246689, difficulty=6.4021, due=now)
    
    # Method B: property assignment
    c2 = Card()
    c2.state = State.Learning
    c2.step = 1
    c2.stability = 0.246689
    c2.difficulty = 6.4021
    c2.due = now
    
    cg1, _ = s.review_card(c1, Rating.Good, now)
    cg2, _ = s.review_card(c2, Rating.Good, now)
    
    print("Method A (Constructor):")
    print(f"  Stability: {c1.stability}")
    print(f"  Due delta (days): {(cg1.due - now).total_seconds() / 86400}")
    
    print("Method B (Assignment):")
    print(f"  Stability: {c2.stability}")
    print(f"  Due delta (days): {(cg2.due - now).total_seconds() / 86400}")

if __name__ == '__main__':
    test()
