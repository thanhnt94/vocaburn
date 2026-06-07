# Overview

Vocaburn is a **flashcard‑only** learning platform derived from the original QuizMind system. It focuses on rapid spaced‑repetition practice for single‑question flashcards, removing the multi‑question quiz workflow.

- Users study individual flashcards, each belonging to a **deck**.
- The FSRSv6 spaced‑repetition algorithm determines the next review interval based on stability, difficulty, and rating (Again, Hard, Good, Easy).
- Gamification (XP, streaks, achievements) rewards consistent study.
- An optional Gemini AI service can generate explanations for any card.

The system consists of a FastAPI backend and a Vite + React 19 frontend, both built as a modular monolith.
