# Architecture

## Backend (FastAPI)
- **Modular monolith**: `app/modules/` contains isolated domain modules (`flashcard`, `auth`, `gamification`, `ai`).
- **Database**: SQLite (development) / PostgreSQL (production) managed by SQLAlchemy.
- **Routing**: Each module exposes a FastAPI router mounted under `/api/v1/`.
- **Background tasks**: Gemini AI explanations run via `FastAPI` background workers.

## Frontend (Vite + React 19)
- **Folder layout** (`client/src/`):
  - `components/` – reusable UI pieces (e.g., `FlashcardCard`, `FlashcardMap`).
  - `pages/` – route‑level views (`Dashboard`, `DeckView`, `StudySession`).
  - `store/` – Zustand global store (`useAppStore`).
  - `lib/` – utilities (API client, helpers).
- **Routing**: React Router v6 with protected routes (`/deck/:id`, `/study/:deckId`).
- **State sync**: TanStack Query handles data fetching, caching, and optimistic updates.
- **Styling**: Tailwind v4 with custom CSS variables for dark‑mode support.
