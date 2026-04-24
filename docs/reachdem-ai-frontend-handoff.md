# ReachDem AI Frontend Handoff

## Placement

The assistant should live inside a right-side drawer opened from the navbar next to the search bar.

## Visual direction

- minimal and premium
- narrow, focused conversation shell
- strong voice affordance
- approvals visually separated from ordinary assistant messages

## Recommended primitives

Use Vercel AI Elements patterns for:

- `Conversation`
- `Message`
- `MessageResponse`
- `PromptInput`
- approval-card rendering for pending actions

## Backend payload to consume

`POST /api/ai/chat`

returns:

- `text`
- `providerUsed`
- `toolCalls`
- `pendingApprovals`
- `contextSummary`

`GET/PUT /api/ai/settings`

returns and updates:

- preferred provider
- OpenAI key configured flag
- voice enabled state
- ElevenLabs agent id

`POST /api/ai/voice/session`

returns:

- `agentId`
- `signedUrl`

## UX states

- `idle`
- `listening`
- `thinking`
- `speaking`
- `awaiting_approval`
- `executing`
