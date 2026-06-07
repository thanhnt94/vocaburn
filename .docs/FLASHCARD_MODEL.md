# Flashcard Model

## Database Schema (SQLAlchemy)
```sql
CREATE TABLE flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL,
    front TEXT NOT NULL,          -- content shown to the learner
    back TEXT,                     -- optional answer/explanation
    ai_explanation TEXT,           -- Gemini‑generated HTML (optional)
    box_level INTEGER DEFAULT 1,  -- Leitner box 1‑5
    consecutive_correct INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    again_count INTEGER DEFAULT 0,
    hard_count INTEGER DEFAULT 0,
    good_count INTEGER DEFAULT 0,
    easy_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## JSON API Representation
```json
{
  "id": 42,
  "deck_id": 3,
  "front": "彼は常に<ruby>忖度<rt>そんたく</rt></ruby>して行動する。",
  "back": "Đọc vị, phỏng đoán ý đồ người khác.",
  "ai_explanation": "<p>...generated HTML...</p>",
  "box_level": 3,
  "stats": {
    "total": 12,
    "again_count": 2,
    "hard_count": 1,
    "good_count": 5,
    "easy_count": 4
  }
}
```

*The `box_level` drives the next review interval according to the Leitner schedule.*
