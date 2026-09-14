# MCQ (Multiple Choice) Practice Mode

> Test your recall with 4-choice quizzes — immediate feedback, streak tracking, and FSRS integration.

---

## Overview

The MCQ (Multiple Choice Question) mode presents vocabulary as a 4-option quiz. The user sees a prompt (word or meaning) and must select the correct answer from four choices. Correct answers are rated **Good (3)** in FSRS; incorrect answers are rated **Again (1)**. This mode reinforces recognition recall and is easier than typing.

**Source Files:**
- Frontend: `client/src/pages/PracticePlay.tsx`
- Backend: `app/modules/deck/routes/play.py` (`record_answer` endpoint)
- Audio: `client/src/hooks/usePracticeAudio.ts`

---

## How It Works

```
┌──────────────────────────┐
│      QUESTION PROMPT     │  ← Shows card front (or back, configurable)
│    「食べる」              │
│                          │
│  ┌──────────────────┐    │
│  │  A) To eat    ✓  │    │  ← 4 choices, shuffled
│  ├──────────────────┤    │
│  │  B) To drink     │    │
│  ├──────────────────┤    │
│  │  C) To sleep     │    │
│  ├──────────────────┤    │
│  │  D) To run       │    │
│  └──────────────────┘    │
│                          │
│  [Streak: 7 🔥]          │
└──────────────────────────┘
```

---

## Answer Generation Algorithm

1. **Distractor Pool**: Up to 50 cards from the current session are randomly sampled.
2. **Distractor Selection**: `selectDistractors()` picks 3 incorrect options that do NOT match the correct answer's text.
3. **Shuffle**: The correct answer and 3 distractors are shuffled using the **Fisher-Yates algorithm**.
4. **Display**: 4 options are rendered as tappable buttons.

> The correct answer's position is randomized each time — no pattern bias.

---

## Answer Validation

- User taps one of the 4 options.
- `handleMCQAnswer()` checks the clicked index against `correct_index`.
- **Correct**: Green highlight, streak increments, proceeds to next card.
- **Incorrect**: Red highlight on wrong choice, green highlight on correct answer, streak resets to 0.

### Feedback Display
After answering, the opposite side of the card is briefly shown:
- If question was the **front** (word), feedback shows the **back** (meaning).
- If question was the **back** (meaning), feedback shows the **front** (word).

---

## FSRS Integration

MCQ answers directly update spaced repetition scheduling:

| Answer | FSRS Rating | Effect |
|--------|-------------|--------|
| Correct | Good (3) | Card stability increases, next review pushed further |
| Incorrect | Again (1) | Card enters relearning, reviewed again soon |

The rating is sent to `POST /api/v1/deck/record_answer` with:
```json
{
  "question_id": "<card_id>",
  "is_correct": true/false,
  "rating": 3 or 1,
  "time_spent": 5.2,
  "session_streak": 7,
  "mode": "mcq"
}
```

---

## Scoring & XP

| Event | XP |
|-------|-----|
| Correct MCQ answer | +3 XP |
| Incorrect MCQ answer | +1 XP |
| Session streak bonus (5+) | +1 XP |

> XP is determined by the backend response (`res.data.xp_gained`), not calculated locally.

---

## Streak & Milestones

- **Streak counter**: Increments on each correct answer, resets on wrong.
- **10× Perfect Streak**: Triggers celebration animation.
- **50% progress**: "Halfway There" milestone notification.
- **100% completion**: Session summary screen with stats.

---

## Card Selection (Local Queue)

Unlike FSRS mode's server-side queue, practice modes use a **local queue**:
- `getNextPracticeIndex()` randomly picks cards from the available pool.
- Pool can be set to **"all"** cards or **"learned"** cards only.
- Already-answered indices are excluded from selection.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` / `2` / `3` / `4` | Select option A/B/C/D |
| `Space` / `Enter` | Advance to next card (after answering) |
| `R` | Replay audio |

---

## Roadmap Integration

MCQ appears as the **"Trắc Nghiệm" (Quiz)** pipeline step:
- Step type: `mcq`
- Parameters: `question_count`, `pass_threshold` (percentage to pass)
- Routes to: `/practice/{deckId}/play?mode=mcq`

### Roadmap Test Mode
In `roadmap_test` mode, MCQ answers are:
1. Saved incrementally via `/roadmap-test-save-progress`
2. Submitted in bulk via `/roadmap-test-submit` upon completion
3. Must meet `pass_threshold` to unlock the next pipeline stage

---

## Known Issues

1. **No Partial Credit**: A near-miss (selecting a semantically similar answer) is treated identically to a completely wrong answer — both receive FSRS Again (1).
2. **Small Deck Distractor Quality**: If a deck has fewer than 4 cards, distractor generation may produce poor or repeated options.
3. **Fast-Click Race Condition**: Rapidly clicking options before the backend responds to `record_answer` could cause out-of-sync state, though the feedback panel somewhat mitigates this.
