# Instructions For Gemini

## Read first

- `docs/reachdem-ai-backend-blueprint.md`
- `docs/reachdem-ai-frontend-handoff.md`
- `docs/reachdem-ai-research-notes.md`
- `apps/web/lib/ai/*`

## Product rules

- assistant opens in a right drawer
- drawer trigger lives next to the search control in the navbar
- voice is first-class
- frontend never executes sensitive actions by itself
- backend `pendingApprovals` are the source of truth for writes

## Backend endpoints

- `POST /api/ai/chat`
- `GET /api/ai/settings`
- `PUT /api/ai/settings`
- `POST /api/ai/voice/session`

## Immediate frontend goal

Build the drawer shell and wire it to the backend responses above using AI Elements-inspired patterns.
