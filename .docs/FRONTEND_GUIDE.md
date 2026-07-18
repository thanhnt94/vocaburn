# Frontend Guide

## Project Layout (`client/src/`)
```
src/
├─ assets/               # Images, SVGs, icons
├─ components/           # Re‑usable UI pieces (e.g. FlashcardCard, FlashcardMap, Navbar)
├─ pages/                # Route‑level views
│   ├─ Dashboard.tsx     # Main entry – shows active roadmap decks & daily progress
│   ├─ Library.tsx       # List of public/shared decks
│   ├─ FlashcardDetail.tsx # Deck overview – displays roadmap status, 7-day calendar, study options, and settings
│   ├─ FlashcardPlay.tsx # Spaced repetition (FSRS) learning session
│   ├─ PracticePlay.tsx  # Free practice play session (MCQ, typing, writing)
│   ├─ ImportFlashcard.tsx # Excel import UI
│   ├─ Settings.tsx      # User preferences & account settings
│   └─ Profile.tsx       # XP, level, achievements
├─ lib/                  # API client wrappers, utility functions
├─ store/                # Zustand global store (`useAppStore.ts`)
├─ App.tsx               # React Router configuration & QueryClientProvider
├─ main.tsx              # Application entry point (mounts `<App/>`)
└─ index.css             # Tailwind entry point + custom globals
```

## State Management
- **Zustand** (`useAppStore.ts`): Stores user profile, authentication status, current deck, gamification counters, and UI flags.
- **TanStack Query**: Handles all async API calls (`fetchDecks`, `fetchFlashcards`, `answerCard`, etc.) providing caching, retries, and optimistic updates.

## Key Components
- **FlashcardCard** – displays front/back, handles reveal, rating buttons (Again/Hard/Good/Easy).
- **FlashcardMap** – grid overview of a deck (similar to `QuestionMapGrid`), color‑coded by box level and attempt status.
- **Navbar / Layout** – protected layout wrapping all `/dashboard/*` routes, shows XP badge and logout.
- **AudioPlayer** – loads generated TTS audio URLs via `/generate-audio/{card_id}`.

## Routing (`App.tsx`)
```tsx
<Route path="/" element={isLoggedIn ? <Dashboard /> : <Landing />} />
<Route path="/login" element={<Login />} />
<Route element={<ProtectedLayout />}>
  <Route path="/library" element={<Library />} />
  <Route path="/flashcard/:id" element={<FlashcardDetail />} />
  <Route path="/flashcard/:id/play" element={<FlashcardPlay />} />
  <Route path="/practice/:id/:subMode?" element={<PracticePlay />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="/settings" element={<Settings />} />
</Route>
```
Protected routes check `store.isLoggedIn` and redirect to `/login` if false.

## Styling
- **Tailwind v4** provides atomic classes; custom dark‑mode variables are defined in `index.css` (`--bg-base`, `--text-primary`).
- Component‑level overrides are kept in CSS modules (`ComponentName.module.css`) when needed.

## Accessibility
- Buttons include `aria-label` based on rating text.
- Focus outlines are preserved via Tailwind `focus-visible` utilities.
- Color‑only status indicators are supplemented with icons (`<CheckIcon/>`, `<XIcon/>`).

## Development Tips
- Run `npm run dev` inside `client/` for hot‑reload on `http://localhost:5173`.
- API proxy is configured in `vite.config.ts` to forward `/api` to the FastAPI backend (`http://127.0.0.1:5080`).
- Use `npm run lint` (eslint) and `npm run format` (prettier) before committing.
