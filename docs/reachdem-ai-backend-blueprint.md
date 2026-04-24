# ReachDem AI Backend Blueprint

## Linear

- Ticket: `REA2-69`
- Branch: `feature/rea2-69-ai-assistant-backend-foundation-gemini-first-orchestration`

## What is integrated

The backend foundation now lives in:

- `apps/web/lib/ai/*`
- `apps/web/app/api/ai/chat/route.ts`
- `apps/web/app/api/ai/settings/route.ts`
- `apps/web/app/api/ai/voice/session/route.ts`

## Current backend slice

- `Gemini` is the default provider when `GEMINI_API_KEY` is available.
- `OpenAI` is user-scoped BYOK and stored encrypted per user/workspace.
- page-aware read context loads automatically for `contact`, `campaign`, and `message`.
- side-effecting actions are surfaced as `pendingApprovals` instead of being executed.
- ElevenLabs voice session creation is available through a signed URL endpoint.

## Important note

This is a backend-first foundation. It is intentionally shaped so the frontend can consume:

- `text`
- `providerUsed`
- `toolCalls`
- `pendingApprovals`
- `contextSummary`

without owning business logic.
