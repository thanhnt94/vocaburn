from fsrs import Card, Scheduler, Rating, State
from datetime import datetime, timezone

def test():
    s = Scheduler()
    now = datetime.now(timezone.utc)
    c = Card(state=State.Learning, step=1, stability=0.246689, difficulty=6.4021, due=now)
    
    cg, _ = s.review_card(c, Rating.Good, now)
    ce, _ = s.review_card(c, Rating.Easy, now)
    
    print("GOOD:")
    print(f"  State: {cg.state}")
    print(f"  Stability: {cg.stability}")
    print(f"  Difficulty: {cg.difficulty}")
    print(f"  Due: {cg.due}")
    print(f"  Due delta (days): {(cg.due - now).total_seconds() / 86400}")
    
    print("\nEASY:")
    print(f"  State: {ce.state}")
    print(f"  Stability: {ce.stability}")
    print(f"  Difficulty: {ce.difficulty}")
    print(f"  Due: {ce.due}")
    print(f"  Due delta (days): {(ce.due - now).total_seconds() / 86400}")

if __name__ == '__main__':
    test()
