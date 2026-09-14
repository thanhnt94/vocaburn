# FSRS Flashcard Mode

> The core spaced repetition engine — learn, review, and retain vocabulary using the FSRS v6 algorithm.

---

## Overview

The FSRS Flashcard Mode is the primary study engine of Vocaburn. It uses the **FSRS v6 (Free Spaced Repetition Scheduler)** algorithm to optimally schedule card reviews based on memory stability and difficulty. Cards are presented one at a time; the user flips to reveal the answer, then rates their recall quality.

**Source Files:**
- Frontend: `client/src/pages/FlashcardPlay.tsx`
- Backend: `app/modules/deck/routes/play.py`, `app/modules/deck/services/fsrs_service.py`
- Keyboard: `client/src/hooks/useKeyboardShortcuts.ts`
- HUD: `client/src/components/study/StudyHeaderTracker.tsx`

---

## Sub-Modes

### 1. FSRS Standard (`mode=fsrs`)
The default study mode. Mixes **new cards** and **due reviews** according to the user's daily goal settings. The FSRS scheduler determines which cards need review based on their `due` timestamp, `stability`, and `difficulty`.

### 2. Review Only (`mode=review`)
Skips all new/unseen cards. Only presents cards that are **due or overdue** for review. Ideal for daily maintenance sessions when you don't want to learn new material.

### 3. Learn New (`mode=new`)
Focuses exclusively on **unseen cards** (FSRS state = 0, New). Ignores all review-due cards. Used when the user wants to batch-learn a set of new vocabulary.

---

## Card Selection & Queueing

Cards are **not** loaded in a static batch. Instead, the system uses a **dynamic server-side queue**:

1. Frontend calls `POST /api/v1/deck/{id}/next-card` with:
   - `mode` — current study mode
   - `answered_indexes` — array of already-answered card indices
   - `random_enabled` — whether to randomize order
2. Backend selects the next optimal card based on FSRS scheduling.
3. When `next_index: -1` or `is_all_completed: true` is returned, the session ends.

**Ordering** is controlled by the `order` URL param or user's `random_enabled` setting.

---

## Card Interaction Flow

```
┌─────────────────┐
│   FRONT FACE    │  ← Question displayed (word, sentence, image)
│   (Tap/Space)   │
└────────┬────────┘
         │ Flip
┌────────▼────────┐
│   BACK FACE     │  ← Answer revealed (meaning, reading, example)
│                 │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐
│  │1 │ │2 │ │3 │ │4 │  ← FSRS Rating Buttons
│  │Ag│ │Hd│ │Gd│ │Ez│
│  └──┘ └──┘ └──┘ └──┘
└─────────────────┘
         │ Rate
┌────────▼────────┐
│   NEXT CARD     │  ← Auto-advance or tap to continue
└─────────────────┘
```

### Swipe Gestures (Mobile)
- **Swipe Right** → Good (3)
- **Swipe Left** → Again (1)
- **Swipe Up** → Easy (4)
- **Swipe Down** → Hard (2)

After rating:
- **Swipe Right** → Next card
- **Swipe Left** → Undo last rating

---

## FSRS Rating System

| Button | Rating | Meaning | XP Earned | Next Interval (Estimate) |
|--------|--------|---------|-----------|--------------------------|
| Again  | 1      | Complete failure to recall | 1 XP | ~1 minute |
| Hard   | 2      | Recalled with significant difficulty | 5 XP | ~5 minutes |
| Good   | 3      | Recalled with moderate effort | 6 XP | ~10 minutes |
| Easy   | 4      | Effortless instant recall | 7 XP | ~4 days |

> **Note:** These intervals are *optimistic local estimates* for UI responsiveness. The actual FSRS-computed intervals are determined server-side and may differ.

### Backend FSRS Processing

When a rating is submitted via `POST /api/v1/deck/record_answer`:

1. Rating (1-4) is mapped to FSRS `Rating` enum.
2. The FSRS v6 `Scheduler` computes the new card state:
   - Updates `stability`, `difficulty`, `state`, `step`, `due`, `last_review`.
3. A custom **stability boost** is applied for Review cards if the computed interval < 1 day:
   - Easy: 5.0× stability boost
   - Good: 3.5× stability boost
4. The `UserCardMastery` record is updated in the database.
5. Legacy `box_level` (1-5) is derived from FSRS state and stability.

### AI Struggle Detection

If a user rates **Again** or **Hard**, the system automatically triggers a background request to `/api/v1/deck/{id}/ask-ai` to generate a mnemonic or hint for that card (if one doesn't already exist).

---

## Scoring & XP

| Event | XP Gained |
|-------|-----------|
| Again rating | +1 XP |
| Hard rating | +5 XP |
| Good rating | +6 XP |
| Easy rating | +7 XP |
| First-time answer bonus | +10 XP |
| Session streak bonus (5+ correct) | +1 XP |
| Daily goal completion bonus | +50 Discipline XP |

### Streak System
- Correct answers (Good/Easy) increment the session streak counter.
- Incorrect answers (Again) reset the streak to 0.
- Milestone celebrations trigger at 5× and 10× streaks (confetti, popups).
- Progress milestones at 25%, 50%, 75%, and 100% of session.

---

## Session Lifecycle

1. **Initialize**: Fetch play data from `/api/v1/deck/{id}/play-data`. Preload audio/images for the next 3 cards.
2. **Study Loop**: Present card → Flip → Rate → Record answer → Fetch next card.
3. **Undo**: `Z` or `Ctrl+Z` reverts the last rating via `POST /api/v1/deck/undo_answer`. Rolls back FSRS state, XP, and daily progress.
4. **Complete**: When no more cards are available, `FsrsCompleteScreen` is displayed showing session summary (cards reviewed, accuracy, XP earned, streak).

---

## StudyHeaderTracker (Live HUD)

A dual-face 3D flip bar at the top of the screen:

**Face 1 — Overview** (default):
- Deck title
- Pipeline step dots (for Roadmap mode)
- Current mode badge
- Combo flame icon
- Progress pill

**Face 2 — Live Telemetry** (tap to toggle):
- Active card timer
- Total session time
- Progress (current/total cards)
- Accuracy percentage
- Average speed per card
- XP score
- Active streak count

**Power Surge**: An animated progress bar overlay that briefly appears when progress advances.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Flip card, or advance to next |
| `1` | Rate Again |
| `2` | Rate Hard |
| `3` | Rate Good |
| `4` | Rate Easy |
| `Z` / `Ctrl+Z` | Undo last rating |
| `R` | Replay audio |
| `S` | Toggle star/bookmark |
| `H` | Ask AI for hint |
| `E` | Open card edit modal |
| `I` | Toggle images visibility |
| `←` / `→` | Previous / Next card |

---

## Known Issues & Quirks

1. **Local State Desync on Rapid Undo**: Optimistic FSRS state updates may briefly conflict with backend queue if undo is triggered before the API response returns (mitigated by `undoInProgressRef`).
2. **Stability Boost Override**: The custom stability boost (up to 5.0×) can significantly inflate stability values over time, diverging from pure FSRS v6 behavior.
3. **Audio Context Overlap**: Fast card-skipping can cause overlapping audio playback despite `cancelAllAudio()` being called on index change.
