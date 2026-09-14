# Listening Practice Mode

> Audio dictation — listen to the pronunciation, then type what you hear for ear training.

---

## Overview

Listening mode is an **audio dictation exercise**. The text prompt is **hidden** — instead, the card's audio plays automatically, and the user must type what they heard. This trains auditory comprehension and spelling simultaneously. The answer validation logic is identical to Typing mode (exact string match, case-insensitive).

**Source Files:**
- Frontend: `client/src/pages/PracticePlay.tsx`
- Audio hook: `client/src/hooks/usePracticeAudio.ts`
- TTS backend: `app/modules/deck/services/audio_generator.py`

---

## How It Works

```
┌──────────────────────────┐
│      🔊 AUDIO PLAYING    │  ← No text shown — listen only!
│    ♪ "ta-be-ru" ♪        │
│                          │
│  [🔊 Replay]  [🐢 Slow]  │  ← Speed controls
│                          │
│  ┌──────────────────────┐│
│  │  食べる              ││  ← Type what you heard
│  └──────────────────────┘│
│                          │
│  [Submit ↵]              │
└──────────────────────────┘
```

---

## Audio Playback

### Auto-Play
- Audio plays **automatically** when a new card loads.
- Uses the `usePracticeAudio` hook for playback management.

### Audio Sources (Priority Order)
1. **Pre-generated audio file**: If the card already has an audio URL (Edge TTS or uploaded).
2. **Streaming Edge TTS**: If no audio file exists, streams from `/api/v1/deck/stream-tts` on-demand.
3. **Web Speech API**: Browser's built-in speech synthesis as last resort.

### Speed Controls
- **Normal (1.0×)**: Standard playback speed
- **Slow (0.8×)**: Reduced speed for difficult words

### Replay
- Tap the 🔊 button or press `R` to replay the audio.

### Preloading
- Audio URLs for the next 3 cards are preloaded to minimize latency.

---

## Answer Validation

Identical to Typing mode:
1. Strip HTML tags from input and valid answers
2. Trim whitespace
3. Convert to lowercase
4. Exact string match: `cleanInput === cleanAns`

> ⚠️ **No fuzzy matching**: Same limitation as Typing mode. A single character error = FSRS Again (1).

---

## FSRS Integration

| Answer | FSRS Rating | Effect |
|--------|-------------|--------|
| Correct | Good (3) | Stability increases |
| Incorrect | Again (1) | Enters relearning |

---

## Scoring & XP

| Event | XP |
|-------|-----|
| Correct listening answer | +3 XP |
| Incorrect listening answer | +1 XP |
| Session streak bonus (5+) | +1 XP |

---

## Card Selection

Same local queue as MCQ and Typing:
- Random selection from available pool
- Pool: **"all"** or **"learned"** cards

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit typed answer |
| `R` | Replay audio |

---

## Roadmap Integration

> ⚠️ **Not Available in Roadmap**: Unlike MCQ and Typing, Listening mode is **not** currently available as a Roadmap pipeline step. The `DeckRoadmapGoalForm` only supports `mcq` and `typing` as practice step types.

Listening can only be accessed via:
- Direct practice mode selection from the deck detail page
- URL: `/practice/{deckId}/play?mode=listening`

---

## Tips for Users

1. **Close your eyes**: Focus purely on the audio without visual distractions.
2. **Use Slow mode**: For unfamiliar words, the 0.8× speed can reveal individual sounds.
3. **Replay before typing**: Listen 2-3 times before attempting to type.
4. **Combine with Typing**: Use Listening mode for words you can read but can't hear. Pair with regular Typing for comprehensive practice.

---

## Known Issues

1. **No Fuzzy Matching**: Especially painful in Listening mode — mishearing a single sound leads to FSRS Again penalty.
2. **Edge TTS Latency**: If no pre-generated audio exists, the first card may have a brief delay while Edge TTS streams.
3. **Audio Preloading**: Only 3 cards ahead are preloaded. Fast-skipping can outpace the preloader.
4. **Furigana/Ruby Cleaning**: Audio text is cleaned of Anki-style `[furigana]` and `<ruby>` tags before TTS generation (handled by `clean_text_for_tts()`).
