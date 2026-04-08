# ReachDem Public API Handoff

## Purpose

This document is for the frontend developer.

It has two goals:

1. explain what has been implemented for the ReachDem public API and how the pieces work together
2. provide a textual API reference that can be reused in frontend documentation

The OpenAPI source of truth is:

- `apps/web/public/openapi.yaml`

This file is the practical handoff.

---

# Part 1: Practical End-to-End Walkthrough

## What is now available

The public API now supports:

- API key authentication
- scope-based authorization
- idempotency
- public message sending
- public campaign management
- public webhook subscription management
- pricing and billing records tied to the originating API key
- outgoing webhook delivery with signing and retry

This is separate from the internal/frontend session-based API.

Public API routes live under:

- `/api/public/v1/...`

Internal/frontend routes continue to live under:

- `/api/v1/...`

The business logic is shared. Only the HTTP contract and auth model differ.

---

## Practical example: a third-party sends an SMS through the public API

### Step 1: the client calls the public route

The third-party sends:

- `POST /api/public/v1/messages/sms`
- `Authorization: Bearer <api_key>`
- `Idempotency-Key: <client_generated_key>`

Main route:

- `apps/web/app/api/public/v1/messages/sms/route.ts`

What this route does:

- validates the bearer API key through `withApiKeyAuth`
- checks scope `messages:write`
- requires `Idempotency-Key`
- validates the JSON body
- calls the shared backend use case `EnqueueSmsUseCase`

Auth wrapper:

- `apps/web/lib/public-api/with-api-key-auth.ts`

This wrapper is responsible for:

- authenticating the key
- injecting `organizationId` and `apiKeyId` in the request context
- running idempotency
- returning standardized public API errors
- logging `request_id`, path, key prefix, status, duration

---

## Step 2: API key auth resolves the tenant context

API key auth is handled by:

- `packages/core/src/services/api-key.service.ts`

It:

- parses the API key format
- hashes the incoming key
- loads the key from DB
- rejects revoked keys
- enforces scopes
- updates `lastUsedAt`

Main DB models involved:

- `ApiKey`
- `ApiIdempotencyRecord`

Schema:

- `packages/database/prisma/schema.prisma`

---

## Step 3: idempotency prevents duplicate processing

Idempotency is handled by:

- `packages/core/src/services/api-idempotency.service.ts`

The wrapper:

- reads the `Idempotency-Key` header
- hashes the request body
- stores the processing state
- replays the stored response if the exact same request is sent again
- rejects reuse of the same idempotency key with a different payload

This applies to public write endpoints such as:

- public message send
- public campaign create
- public campaign launch

---

## Step 4: the SMS use case creates the message and reserves billing

Core use case:

- `packages/core/src/services/enqueue-sms.usecase.ts`

What happens there:

1. it checks workspace-scoped idempotency at the message level
2. it creates the `Message`
3. it calls `MessagingEntitlementsService.reserveMessageSend(...)`
4. it stores the message with:
   - `organizationId`
   - `apiKeyId`
   - content and destination
5. it records a `MessageEvent`
6. it publishes the job to the worker queue

Important detail:

- `Message.apiKeyId` is now persisted

This is critical because later async processing must still know which API key originated the message.

---

## Step 5: pricing and billing are resolved from the API key

Pricing:

- `packages/core/src/services/api-pricing.service.ts`

Billing:

- `packages/core/src/services/billing-record.service.ts`

Entitlements / reservation:

- `packages/core/src/services/messaging-entitlements.service.ts`

What happens:

- the system resolves the pricing profile for the API key
- if the key has no custom pricing profile, it falls back to the default active API pricing profile
- the wallet is debited from `Organization.creditBalance`
- a `BillingRecord` is created

If the included plan quota is exhausted and the remaining `creditBalance` is not enough to cover the billable part:

- the action is rejected
- no send is accepted
- no final billing debit is applied
- the public API currently returns a `400` with `error.code = "validation_error"`
- the message text explains the actual cause, for example:
  - `Insufficient credit balance to send 1 sms message(s).`
  - `Insufficient credit balance.`

Important billing design:

- wallet is organization-level
- pricing can vary by API key
- `BillingRecord` snapshots the effective price used at send time
- this preserves history even if prices change later

DB models involved:

- `ApiPricingProfile`
- `BillingRecord`
- `Organization.creditBalance`
- `Organization.creditCurrency`

---

## Step 6: a message event is recorded

Event service:

- `packages/core/src/services/message-event.service.ts`

Models:

- `MessageEvent`
- `WebhookDelivery`

When the message is accepted/queued/sent/failed/delivered:

- a `MessageEvent` is created
- webhook deliveries may be enqueued automatically if the originating API key has active webhook subscriptions

This is where the `apiKeyId` link becomes important again.

---

## Step 7: webhook subscriptions are resolved automatically

Webhook subscription service:

- `packages/core/src/services/api-webhook-subscription.service.ts`

Public routes:

- `apps/web/app/api/public/v1/webhook-subscriptions/route.ts`
- `apps/web/app/api/public/v1/webhook-subscriptions/[id]/route.ts`

The system:

- finds active subscriptions for the API key
- filters them by `eventTypes`
- creates `WebhookDelivery` rows for matching events

Supported event examples:

- `message.accepted`
- `message.sent`
- `message.delivered`
- `message.failed`
- `*`

---

## Step 8: the worker processes the message asynchronously

Queue publish helpers:

- `apps/web/lib/publish-sms-job.ts`
- `apps/web/lib/publish-email-job.ts`
- `apps/web/lib/publish-campaign-launch-job.ts`

Worker processing:

- `packages/core/src/services/process-sms-message-job.usecase.ts`
- `packages/core/src/services/process-email-message-job.usecase.ts`

Worker scheduler / delivery loop:

- `apps/workers/src/scheduled.ts`
- `packages/core/src/services/process-webhook-deliveries.usecase.ts`

What happens:

- the message is processed asynchronously
- provider attempts are recorded
- final message status is updated
- more `MessageEvent`s may be emitted
- webhook deliveries are retried with backoff if needed

---

## Step 9: outgoing webhooks are signed and delivered

Webhook delivery service:

- `packages/core/src/services/webhook-delivery.service.ts`

Scheduled processing:

- `packages/core/src/services/process-webhook-deliveries.usecase.ts`
- `apps/workers/src/scheduled.ts`

Behavior:

- pending webhook deliveries are claimed
- HTTP requests are sent to subscriber target URLs
- if a signing secret exists, the worker sends:
  - `x-reachdem-signature`
- the worker also sends:
  - `x-reachdem-event-type`
  - `x-reachdem-organization-id`
  - `x-reachdem-api-key-id`
  - `x-reachdem-attempt`
- failures are retried with backoff

---

## Practical example: a third-party launches a campaign

The public campaign flow is similar, but with more steps.

Main public routes:

- `apps/web/app/api/public/v1/campaigns/route.ts`
- `apps/web/app/api/public/v1/campaigns/[id]/route.ts`
- `apps/web/app/api/public/v1/campaigns/[id]/audience/route.ts`
- `apps/web/app/api/public/v1/campaigns/[id]/launch/route.ts`

Shared services:

- `packages/core/src/services/campaign.service.ts`
- `packages/core/src/services/request-campaign-launch.usecase.ts`
- `packages/core/src/services/process-campaign-launch-job.usecase.ts`
- `packages/core/src/services/launch-campaign.usecase.ts`

Key design point:

- `Campaign.apiKeyId` is persisted

This ensures:

- launch-time billing remains tied to the right API key
- generated messages inherit the right `apiKeyId`
- webhook subscriptions remain consistent with the API client that created the campaign

---

## Summary of the public API architecture

### HTTP layer

- `apps/web/app/api/public/v1/...`

### Auth / idempotency layer

- `apps/web/lib/public-api/with-api-key-auth.ts`
- `packages/core/src/services/api-key.service.ts`
- `packages/core/src/services/api-idempotency.service.ts`

### Domain logic

- messages:
  - `enqueue-sms.usecase.ts`
  - `enqueue-email.usecase.ts`
- campaigns:
  - `campaign.service.ts`
  - `request-campaign-launch.usecase.ts`
  - `process-campaign-launch-job.usecase.ts`

### Billing / pricing

- `api-pricing.service.ts`
- `billing-record.service.ts`
- `messaging-entitlements.service.ts`

### Events / webhooks

- `message-event.service.ts`
- `api-webhook-subscription.service.ts`
- `webhook-delivery.service.ts`
- `process-webhook-deliveries.usecase.ts`

### Persistence

- `packages/database/prisma/schema.prisma`

---

# Part 2: Textual API Documentation

## Base URL

Public API base:

- `/api/public/v1`

Examples:

- `POST /api/public/v1/messages/sms`
- `POST /api/public/v1/campaigns`

---

## Authentication

All public endpoints use API key authentication.

Header:

```http
Authorization: Bearer <api_key>
```

The key determines:

- the organization context
- the scopes
- the pricing profile
- the webhook subscriptions

---

## Scopes

Current scopes used by the public API:

- `messages:read`
- `messages:write`
- `campaigns:read`
- `campaigns:write`
- `webhooks:read`
- `webhooks:write`

Recommended frontend behavior:

- detect `403 insufficient_scope`
- show a specific message about missing permissions

---

## Idempotency

Some write endpoints require:

```http
Idempotency-Key: <client_generated_key>
```

This is required on:

- `POST /messages/sms`
- `POST /messages/email`
- `POST /campaigns`
- `POST /campaigns/{id}/launch`

Recommended frontend/client rule:

- generate one stable idempotency key per user action
- if retrying the same exact action, reuse the same key
- do not reuse the same key for a different payload

---

## Standard error format

All public API errors use:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  },
  "request_id": "string"
}
```

Common error codes:

- `unauthorized`
- `invalid_api_key`
- `api_key_revoked`
- `insufficient_scope`
- `missing_idempotency_key`
- `idempotency_conflict`
- `validation_error`
- `not_found`
- `internal_error`

Important current behavior:

- insufficient wallet / insufficient billable credit currently maps to:
  - `400`
  - `error.code = "validation_error"`
- the useful business reason is therefore mainly in `error.message`

Example:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Insufficient credit balance to send 1 sms message(s).",
    "details": {}
  },
  "request_id": "..."
}
```

Note:

- this works correctly functionally
- but from an API design perspective it is a bit generic
- a future improvement would be to introduce a dedicated public error code such as:
  - `insufficient_balance`
  - or `insufficient_credits`

---

## Public Messages API

### POST `/messages/sms`

Creates an SMS message.

Headers:

- `Authorization: Bearer <api_key>`
- `Idempotency-Key: <key>`

Body:

```json
{
  "to": "+237699999999",
  "text": "Hello from ReachDem",
  "from": "ReachDem",
  "scheduledAt": "2026-04-08T12:00:00.000Z"
}
```

Notes:

- `to` must be E.164
- `from` is client-provided, but final sender may be normalized by ReachDem business rules

Success response:

```json
{
  "message_id": "string",
  "status": "queued",
  "correlation_id": "string",
  "idempotent": false
}
```

Possible statuses in immediate response:

- `queued`
- `scheduled`

If the included plan quota is already exhausted and the wallet balance is too low:

- response is `400`
- `error.code` is currently `validation_error`
- `error.message` explains that credit balance is insufficient

---

### POST `/messages/email`

Creates an email message.

Headers:

- `Authorization: Bearer <api_key>`
- `Idempotency-Key: <key>`

Body:

```json
{
  "to": "user@example.com",
  "subject": "Welcome",
  "html": "<p>Hello</p>",
  "from": "ReachDem Notifications",
  "scheduledAt": "2026-04-08T12:00:00.000Z"
}
```

Success response:

```json
{
  "message_id": "string",
  "status": "queued",
  "correlation_id": "string",
  "idempotent": false
}
```

If the included plan quota is already exhausted and the wallet balance is too low:

- response is `400`
- `error.code` is currently `validation_error`
- `error.message` explains that credit balance is insufficient

---

### GET `/messages`

Lists messages for the API key organization.

Query params:

- `status`
- `from`
- `to`
- `limit`
- `cursor`

Response:

```json
{
  "items": [],
  "nextCursor": "string | null"
}
```

---

### GET `/messages/{id}`

Returns one message with attempts.

Response shape:

```json
{
  "id": "string",
  "campaignId": "string | null",
  "channel": "sms | email",
  "toLast4": "5678",
  "from": "ReachDem",
  "status": "queued",
  "providerSelected": null,
  "correlationId": "string",
  "idempotencyKey": "string",
  "scheduledAt": null,
  "createdAt": "date-time",
  "updatedAt": "date-time",
  "attempts": []
}
```

---

## Public Campaigns API

### GET `/campaigns`

Lists campaigns for the API key organization.

Query params:

- `limit`
- `cursor`

---

### POST `/campaigns`

Creates a draft campaign.

Headers:

- `Authorization: Bearer <api_key>`
- `Idempotency-Key: <key>`

Example SMS body:

```json
{
  "name": "April SMS Campaign",
  "channel": "sms",
  "content": {
    "text": "Hello from ReachDem",
    "from": "ReachDem"
  }
}
```

Example email body:

```json
{
  "name": "April Email Campaign",
  "channel": "email",
  "content": {
    "subject": "April offer",
    "html": "<p>Offer content</p>",
    "from": "ReachDem Notifications"
  }
}
```

Notes:

- campaign is created in `draft`
- campaign keeps the originating `apiKeyId`

---

### GET `/campaigns/{id}`

Returns one campaign.

---

### PATCH `/campaigns/{id}`

Updates a draft campaign only.

If the campaign is no longer editable:

- response is `400 validation_error`

---

### GET `/campaigns/{id}/audience`

Returns the campaign audience sources.

---

### POST `/campaigns/{id}/audience`

Replaces the campaign audience.

Body:

```json
{
  "audiences": [
    { "sourceType": "group", "sourceId": "uuid" },
    { "sourceType": "segment", "sourceId": "uuid" }
  ]
}
```

Notes:

- only draft campaigns can be modified
- sources must belong to the same organization

---

### POST `/campaigns/{id}/launch`

Launches a draft campaign.

Headers:

- `Authorization: Bearer <api_key>`
- `Idempotency-Key: <key>`

Behavior:

- validates campaign status
- validates eligible audience
- reserves billing
- sets campaign to `running`
- enqueues async launch processing

If the included plan quota is exhausted and the remaining wallet balance is insufficient:

- launch is rejected before processing
- the campaign is not accepted for asynchronous execution
- response is `400`
- `error.code` is currently `validation_error`
- `error.message` explains the insufficient balance situation

Success response:

```json
{
  "message": "Campaign launch queued successfully"
}
```

---

## Public Webhook Subscriptions API

### GET `/webhook-subscriptions`

Lists webhook subscriptions for the authenticated API key.

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "apiKeyId": "uuid",
      "targetUrl": "https://example.com/webhooks/reachdem",
      "eventTypes": ["message.sent", "message.failed"],
      "active": true,
      "hasSigningSecret": true,
      "createdAt": "date-time",
      "updatedAt": "date-time"
    }
  ]
}
```

Important:

- `signingSecret` is not returned by list/get style responses

---

### POST `/webhook-subscriptions`

Creates a subscription for the authenticated API key.

Body:

```json
{
  "targetUrl": "https://example.com/webhooks/reachdem",
  "eventTypes": ["message.sent", "message.failed"],
  "active": true
}
```

Success response:

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "apiKeyId": "uuid",
  "targetUrl": "https://example.com/webhooks/reachdem",
  "eventTypes": ["message.sent", "message.failed"],
  "active": true,
  "hasSigningSecret": true,
  "signingSecret": "returned_once_only",
  "createdAt": "date-time",
  "updatedAt": "date-time"
}
```

Important:

- the client must store `signingSecret`
- it may not be shown again later

---

### PATCH `/webhook-subscriptions/{id}`

Updates a subscription.

Allowed fields:

- `targetUrl`
- `eventTypes`
- `active`
- `rotateSigningSecret`

Example:

```json
{
  "active": false,
  "eventTypes": ["*"],
  "rotateSigningSecret": true
}
```

If `rotateSigningSecret = true`:

- a new secret is generated
- it is returned once in the response

---

### DELETE `/webhook-subscriptions/{id}`

Deletes the subscription.

Response:

- `204 No Content`

---

## Outgoing webhook behavior

When subscribed events occur, ReachDem sends webhooks to `targetUrl`.

Current headers sent by the worker include:

- `content-type: application/json`
- `x-reachdem-event-type`
- `x-reachdem-organization-id`
- `x-reachdem-api-key-id`
- `x-reachdem-attempt`
- `x-reachdem-signature` if a signing secret exists

Signature:

- HMAC SHA-256 of the raw JSON payload

The consumer should:

1. keep the raw request body
2. recompute HMAC SHA-256 with the stored signing secret
3. compare with `x-reachdem-signature`

---

## Recommended frontend documentation structure

For the frontend docs page, I recommend:

1. Overview
2. Authentication
3. Idempotency
4. Error format
5. Messages API
6. Campaigns API
7. Webhook subscriptions API
8. Webhook signature verification
9. Common integration examples

---

## Final note for frontend work

For frontend/API docs, the most important ideas to communicate are:

- public API is API key based, not cookie/session based
- idempotency is mandatory on critical write endpoints
- messages and campaigns are organization-scoped through the key
- billing is tied to the originating API key when relevant
- webhook subscriptions are managed per API key
- signing secrets are shown only once on create/rotation
