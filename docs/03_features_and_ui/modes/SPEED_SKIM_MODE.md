# Speed Skim Mode

> Rapid-fire card introduction — flip through vocabulary at maximum speed without FSRS grading pressure.

---

## Overview

Speed Skim is a **1-tap fast introduction mode** designed for quickly exposing yourself to new vocabulary without the cognitive overhead of FSRS grading. Cards are automatically marked as "viewed" and implicitly rated **Good (3)**, granting small XP rewards. Ideal for pre-study scanning or refreshing memory before a formal FSRS session.

**Aliases:** `speed_skim`, `skim`, `flip`

**Source Files:**
- Frontend: `client/src/pages/FlashcardPlay.tsx` (shared with FSRS mode)
- Backend: `app/modules/deck/routes/play.py`

---

## How It Works

```
┌─────────────────┐
│   FRONT FACE    │  ← Word/phrase displayed
│                 │
│   (Tap/Space)   │
└────────┬────────┘
         │ Flip (auto or manual)
┌────────▼────────┐
│   BACK FACE     │  ← Meaning revealed
│                 │
│   (Tap/Space)   │  ← No rating buttons!
└────────┬────────┘
         │ Auto-advance
┌────────▼────────┐
│   NEXT CARD     │  ← Immediate transition
└─────────────────┘
```

### Key Differences from FSRS Mode
| Aspect | FSRS Mode | Speed Skim |
|--------|-----------|------------|
| Rating buttons | Again/Hard/Good/Easy | None — auto-rated |
| Implicit rating | User chooses | Always Good (3) |
| XP per card | 1-7 based on rating | Flat +3 XP |
| Card timer pressure | Yes | No |
| Auto-advance | Optional | Supported (with auto-play) |
| FSRS scheduling impact | Full | Minimal (Good rating only) |

---

## Card Selection

Uses the same dynamic server-side queue as FSRS mode:
- `POST /api/v1/deck/{id}/next-card` with `mode=speed_skim`
- Backend typically serves **new/unseen cards** first
- `answered_indexes` tracks already-skimmed cards

---

## Scoring

| Event | XP |
|-------|-----|
| Each card skimmed | +3 XP (flat) |
| Session streak bonus (5+) | +1 XP |

> Speed Skim does not apply the first-time answer bonus (+10 XP) that FSRS mode provides.

---

## FSRS Impact

Each skimmed card is recorded as a **Good (3)** rating on the backend:
- Card transitions from **New (0)** → **Learning (1)**
- Stability and difficulty are initialized
- A `due` date is set according to FSRS v6 computation
- The card will appear in future FSRS Review sessions

> ⚠️ Because all cards receive the same rating regardless of actual knowledge, Speed Skim introduces imprecision into the FSRS schedule. Use it for initial exposure, then follow up with proper FSRS review.

---

## Auto-Play Integration

Speed Skim supports **Auto-Play mode** (`autoplay`):
1. Card front is shown → audio plays automatically
2. After audio finishes → card auto-flips to back
3. After a brief delay → auto-advances to next card
4. User can press `P` to pause/resume

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Flip card / Advance to next |
| `R` | Replay audio |
| `S` | Toggle star |
| `P` | Pause/Resume auto-play |
| `←` / `→` | Previous / Next card |

---

## Roadmap Integration

Speed Skim appears as the **"Lướt Nhanh" (Quick Skim)** pipeline step in the Roadmap system:
- Step type: `speed_skim`
- Configurable parameter: `daily_count` (number of cards to skim)
- Routes to: `/flashcard/{deckId}/play?mode=speed_skim`

---

## Use Cases

1. **Pre-study warm-up**: Quickly scan 50-100 new words before a focused FSRS session.
2. **Deck preview**: Browse a newly imported deck to gauge difficulty and content.
3. **Memory refresh**: Rapidly revisit cards you've already learned to reinforce passive recognition.
4. **High-volume introduction**: When learning a large batch (100+ cards), skim first, then FSRS review the next day.
