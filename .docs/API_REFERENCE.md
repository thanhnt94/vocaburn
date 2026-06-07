# API Reference

## Base URL
```
http://localhost:5080/api/v1
```

## Flashcard Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/flashcards` | List all flashcards (optionally filter by `deck_id`). |
| `GET` | `/flashcards/{id}` | Retrieve a single flashcard with its learning stats. |
| `POST` | `/flashcards` | Create a new flashcard. Body: `{deck_id, front, back?, ai_explanation?}` |
| `PUT` | `/flashcards/{id}` | Update fields (e.g., `front`, `back`). |
| `DELETE` | `/flashcards/{id}` | Delete a flashcard permanently. |
| `POST` | `/flashcards/{id}/answer` | Submit an answer rating (`again`, `hard`, `good`, `easy`). Updates Leitner box and stats, returns updated card.
| `POST` | `/flashcards/{id}/explain` | Trigger Gemini AI to generate `ai_explanation` (background task). |

## Deck Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/decks` | List all decks belonging to the current user. |
| `GET` | `/decks/{id}` | Get deck metadata and card count. |
| `POST` | `/decks` | Create a new deck (`{title, description, tags?}`). |
| `PUT` | `/decks/{id}` | Rename or update deck metadata. |
| `DELETE` | `/decks/{id}` | Delete a deck (cascades flashcards). |

## Gamification Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` /`me` | `/auth/me` | Current user profile (XP, level, streak). |
| `GET` | `/profile/achievements` | List earned achievements. |
| `GET` | `/profile/history` | Historical study stats (daily XP, card reviews). |

All endpoints return JSON with a standard envelope:
```json
{ "success": true, "data": {...}, "error": null }
```
Error responses contain `{ "success": false, "error": "Message" }`.

Authentication is cookie‑based; include credentials in every request (Axios `withCredentials: true`).
