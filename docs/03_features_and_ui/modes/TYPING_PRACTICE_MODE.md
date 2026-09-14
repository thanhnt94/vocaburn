# Typing Practice Mode

> Active recall through keyboard input — type the answer from memory for deep retention.

---

## Overview

Typing mode is the most demanding practice mode. Instead of choosing from options, the user must **type the answer entirely from memory**. This engages active production recall, which research shows produces stronger long-term retention than recognition (MCQ). Answers are validated with **exact string matching** (case-insensitive).

**Source Files:**
- Frontend: `client/src/pages/PracticePlay.tsx`
- Backend: `app/modules/deck/routes/play.py` (`record_answer` endpoint)

---

## How It Works

```
┌──────────────────────────┐
│      QUESTION PROMPT     │  ← Shows card front (or back)
│    "To eat"              │
│                          │
│  ┌──────────────────────┐│
│  │  食べる              ││  ← Text input field
│  └──────────────────────┘│
│                          │
│  [Submit ↵]              │
│                          │
│  ✅ Correct! +5 XP       │  ← Immediate feedback
└──────────────────────────┘
```

---

## Answer Validation

### Process
1. User types answer in the text input field.
2. Presses **Enter** or taps **Submit**.
3. `handleTypingAnswer()` validates:
   - Strips HTML tags from both input and valid answers
   - Trims whitespace
   - Converts to lowercase
   - Checks for **exact string match**: `cleanInput === cleanAns`

### Valid Answers
Multiple correct answers are supported:
- Parsed from comma-separated strings (e.g., `"eat, to eat, eating"`)
- Falls back to card `front` field if no explicit answer list
- `.some(ans => cleanInput === cleanAns)` — any match counts as correct

### Feedback
- **Correct** ✅: Green checkmark, streak increments
- **Incorrect** ❌: Red indicator, reveals all accepted correct answers so the user can learn from the mistake

> ⚠️ **No fuzzy matching**: There is no Levenshtein distance or typo tolerance. `"taberu"` ≠ `"taveru"`. Minor typos are penalized as full failures with FSRS Again (1).

---

## FSRS Integration

| Answer | FSRS Rating | Effect |
|--------|-------------|--------|
| Correct | Good (3) | Stability increases, interval extends |
| Incorrect | Again (1) | Enters relearning, reviewed again soon |

Submission payload:
```json
{
  "question_id": "<card_id>",
  "is_correct": true/false,
  "rating": 3 or 1,
  "time_spent": 8.5,
  "session_streak": 3,
  "mode": "typing"
}
```

---

## Scoring & XP

| Event | XP |
|-------|-----|
| Correct typing answer | +5 XP |
| Incorrect typing answer | +1 XP |
| Session streak bonus (5+) | +1 XP |

> Typing mode rewards more XP per correct answer than MCQ (+5 vs +3) because it requires active production rather than passive recognition.

---

## Card Selection

Same local queue system as MCQ:
- `getNextPracticeIndex()` randomly selects from the available pool
- Pool: **"all"** cards or **"learned"** cards only
- Already-answered indices are excluded

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit typed answer |
| `Tab` | Skip to next card (if supported) |
| `R` | Replay audio |

> The text input captures most keyboard input, so single-key shortcuts (1-4, S, H) are disabled during active typing.

---

## Roadmap Integration

Typing appears as the **"Gõ Từ" (Type Word)** pipeline step:
- Step type: `typing`
- Parameters: `question_count`, `pass_threshold` (percentage to pass)
- Routes to: `/practice/{deckId}/play?mode=typing`

### Roadmap Test Mode
In `roadmap_test` mode:
1. Progress saved incrementally via `/roadmap-test-save-progress`
2. Bulk submission via `/roadmap-test-submit` on completion
3. Must meet `pass_threshold` to advance

---

## Tips for Users

1. **Case doesn't matter**: `"Taberu"` = `"taberu"` = `"TABERU"` ✓
2. **Spelling must be exact**: No typo tolerance — double-check before submitting
3. **Multiple valid answers**: If a card has comma-separated alternatives, any one works
4. **Use for production**: Typing mode is best for words you can recognize but can't produce. Pair with MCQ for a recognition → production learning flow.

---

## Known Issues

1. **No Fuzzy Matching**: The biggest limitation. A single character typo registers as a complete failure (FSRS Again), which can be frustrating and may over-penalize near-correct recall.
2. **IME Composition**: For CJK languages (Japanese, Chinese), the answer must match the final committed text. Intermediate IME composition states are not validated.
3. **Multi-answer delimiter**: Only comma-separated alternatives are parsed. Semicolons, slashes, or other delimiters are not recognized.
