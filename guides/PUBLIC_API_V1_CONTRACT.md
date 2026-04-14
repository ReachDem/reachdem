# ReachDem Public API Contract V1

## Purpose

This document defines the public client-facing API contract for ReachDem V1.

It is intentionally narrower than the full internal application surface. The goal is to expose only the resources and behaviors that external clients can safely build against.

## Scope

Public V1 includes:

- Transactional messaging via a unified `messages` API
- Marketing resources: `contacts`, `groups`, `segments`, `campaigns`
- Campaign audience management and campaign stats
- Read-only billing summary related to messaging usage and available balance
- Outbound webhooks emitted by ReachDem

Public V1 excludes:

- Internal dashboard-only session auth flows
- Internal workspace configuration details
- Internal payment orchestration and provider-specific checkout internals
- Internal-only fields, hidden counters, storage-specific implementation details
- Product areas unrelated to messages, campaigns, groups, segments, and billing visibility

## Design Principles

- Public API authentication uses API keys, not dashboard session auth.
- All write operations that create or enqueue work must support idempotency through the `Idempotency-Key` header.
- Public payloads must expose domain concepts, not internal persistence details.
- Public responses must stay stable even if internal routes or services change.
- Billing is reflected as usage and balance effects of sending messages, not as internal accounting mechanics.

## Authentication

Every authenticated request must include:

- `Authorization: Bearer <api_key>`

The API key resolves the client workspace context server-side. Public clients do not send internal organization or workspace identifiers to declare scope.

## Idempotency

The following operations require:

- `Idempotency-Key: <client-generated-key>`

Required for:

- `POST /v1/messages/send`
- `POST /v1/contacts`
- `POST /v1/groups`
- `POST /v1/segments`
- `POST /v1/campaigns`
- `POST /v1/campaigns/{id}/audience`
- `POST /v1/campaigns/{id}/launch`

Expected behavior:

- First successful execution returns `201 Created` for creation/enqueue actions.
- Replayed request with the same semantic input and same key returns `200 OK` with the original response body.
- Reusing a key with a materially different payload returns a conflict-style error.

## Common Error Shape

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Public Business Rules

### Messaging

- V1 public messaging is transactional only.
- Supported channels are `sms` and `email`.
- A message may be sent immediately or scheduled.
- Sending a message consumes workspace credits.
- SMS sender ID uses the workspace sender ID only when the workspace is verified.
- If the workspace is not verified for SMS sender identity, ReachDem falls back to `ReachDem`.

### Contacts

- A contact must have at least one reachable channel: `phoneE164` or `email`.
- Public clients can manage contacts, but they do not control internal validation flags or provider resolution metadata.

### Groups

- Groups are static contact collections.
- Group membership is explicitly managed.

### Segments

- Segments are dynamic filters over contacts.
- Segments are not static lists.
- Segment preview returns contacts matching the current filter definition.

### Campaigns

- Campaigns can target one or more audiences.
- Supported audience source types are `group` and `segment`.
- `inline_list` is out of scope for V1.
- Campaign audience is not snapshotted at scheduling time in V1.
- Audience resolution occurs at launch/execution time with de-duplication by contact.
- Campaigns and campaign audience are only editable while the campaign is in `draft`.

### Billing

- Billing for public V1 is messaging-driven.
- A message send decreases available workspace balance.
- Usage counters are incremented when sending is accepted by ReachDem for processing.
- Public billing exposure is limited to summary visibility needed by clients.
- Public V1 does not expose internal pricing formulas, internal counters, or provider settlement details.

## Resource Model

### Message

```json
{
  "id": "msg_123",
  "type": "transactional",
  "channel": "sms",
  "status": "queued",
  "correlationId": "uuid",
  "createdAt": "2026-04-12T15:00:00Z",
  "scheduledAt": null
}
```

### Contact

```json
{
  "id": "ctc_123",
  "name": "Jane Doe",
  "phoneE164": "+237600000000",
  "email": "jane@example.com",
  "gender": "UNKNOWN",
  "birthdate": null,
  "address": null,
  "work": null,
  "enterprise": null,
  "customFields": {}
}
```

### Group

```json
{
  "id": "grp_123",
  "name": "VIP Customers",
  "description": "Static list for VIP messaging",
  "createdAt": "2026-04-12T15:00:00Z",
  "updatedAt": "2026-04-12T15:00:00Z"
}
```

### Segment

```json
{
  "id": "seg_123",
  "name": "Active customers in Douala",
  "description": "Dynamic segment",
  "definition": {
    "op": "AND",
    "children": [
      {
        "field": "city",
        "operator": "eq",
        "type": "string",
        "value": "Douala"
      }
    ]
  }
}
```

### Campaign

```json
{
  "id": "cmp_123",
  "name": "April reminder",
  "description": "Billing reminder",
  "channel": "sms",
  "status": "draft",
  "content": {
    "text": "Hello from ReachDem"
  },
  "scheduledAt": null,
  "createdAt": "2026-04-12T15:00:00Z",
  "updatedAt": "2026-04-12T15:00:00Z"
}
```

### Billing Summary

```json
{
  "workspace": {
    "balance": {
      "amountMinor": 120000,
      "currency": "XAF"
    },
    "creditBalance": 120000,
    "smsQuotaUsed": 42,
    "emailQuotaUsed": 18,
    "usesSharedCredits": true
  }
}
```

## Endpoints

### Messaging

#### POST `/v1/messages/send`

Unified transactional send endpoint.

Headers:

- `Authorization: Bearer <api_key>`
- `Idempotency-Key: <key>`

Request body:

```json
{
  "type": "transactional",
  "channel": "sms",
  "to": "+237600000000",
  "text": "Your OTP is 123456",
  "from": "ReachDem",
  "scheduledAt": "2026-04-13T10:00:00Z"
}
```

Email variant:

```json
{
  "type": "transactional",
  "channel": "email",
  "to": "user@example.com",
  "subject": "Welcome to ReachDem",
  "html": "<p>Hello</p>",
  "from": "ReachDem"
}
```

Response:

```json
{
  "message_id": "msg_123",
  "status": "queued",
  "correlation_id": "a78a7d2d-4a1d-4d5a-98ce-0bb3bc7e4c2c",
  "idempotent": false
}
```

Rules:

- `type` must be `transactional`
- `channel` must be `sms` or `email`
- SMS requires `to` in E.164 format and `text`
- Email requires `to`, `subject`, and `html`
- Attachments and templating variables are out of scope for V1

#### GET `/v1/messages`

Lists messages visible to the API key workspace.

Supported query parameters:

- `status`
- `from`
- `to`
- `limit`
- `cursor`

#### GET `/v1/messages/{id}`

Returns a single message summary and public delivery state.

### Contacts

#### GET `/v1/contacts`

List contacts.

#### POST `/v1/contacts`

Create a contact.

Request body:

```json
{
  "name": "Jane Doe",
  "phoneE164": "+237600000000",
  "email": "jane@example.com",
  "customFields": {
    "custom.source": "expo2026"
  }
}
```

Rules:

- At least one of `phoneE164` or `email` is required

#### GET `/v1/contacts/{id}`

Get a contact.

#### PATCH `/v1/contacts/{id}`

Update a contact.

#### DELETE `/v1/contacts/{id}`

Delete a contact.

### Groups

#### GET `/v1/groups`

List groups.

#### POST `/v1/groups`

Create a group.

#### GET `/v1/groups/{id}`

Get a group.

#### PATCH `/v1/groups/{id}`

Update a group.

#### DELETE `/v1/groups/{id}`

Delete a group.

#### GET `/v1/groups/{id}/contacts`

List contacts in a group.

#### POST `/v1/groups/{id}/contacts`

Add contacts to a group.

Request body:

```json
{
  "contactIds": ["ctc_1", "ctc_2"]
}
```

#### DELETE `/v1/groups/{id}/contacts`

Remove contacts from a group.

### Segments

#### GET `/v1/segments`

List segments.

#### POST `/v1/segments`

Create a segment.

#### GET `/v1/segments/{id}`

Get a segment.

#### PATCH `/v1/segments/{id}`

Update a segment.

#### DELETE `/v1/segments/{id}`

Delete a segment.

#### POST `/v1/segments/preview`

Preview contacts matching a segment definition before saving.

#### GET `/v1/segments/{id}/contacts`

List contacts currently matching a saved segment.

### Campaigns

#### GET `/v1/campaigns`

List campaigns.

#### POST `/v1/campaigns`

Create a draft campaign.

Request body:

```json
{
  "name": "April reminder",
  "description": "Reminder campaign",
  "channel": "sms",
  "content": {
    "text": "Hello from ReachDem"
  },
  "scheduledAt": null
}
```

#### GET `/v1/campaigns/{id}`

Get a campaign.

#### PATCH `/v1/campaigns/{id}`

Update a draft campaign.

#### DELETE `/v1/campaigns/{id}`

Delete a draft campaign.

#### GET `/v1/campaigns/{id}/audience`

List attached audience sources.

Response example:

```json
[
  {
    "id": "aud_1",
    "campaignId": "cmp_123",
    "sourceType": "group",
    "sourceId": "grp_123",
    "createdAt": "2026-04-12T15:00:00Z"
  }
]
```

#### POST `/v1/campaigns/{id}/audience`

Replace the audience definition for a draft campaign.

Request body:

```json
{
  "audiences": [
    {
      "sourceType": "group",
      "sourceId": "grp_123"
    },
    {
      "sourceType": "segment",
      "sourceId": "seg_456"
    }
  ]
}
```

Rules:

- Only `group` and `segment` are supported
- Multiple audience sources are allowed
- Duplicate audience entries are ignored
- Audience sources must belong to the same workspace

#### POST `/v1/campaigns/{id}/launch`

Launch a draft campaign.

Rules:

- ReachDem resolves the final audience at launch/execution time
- Contacts are de-duplicated across all attached audience sources
- Launch consumes balance according to the final eligible recipient count

#### GET `/v1/campaigns/{id}/stats`

Returns public campaign metrics such as:

- `audienceSize`
- `pendingCount`
- `sentCount`
- `failedCount`
- `skippedCount`
- `clickCount`
- `uniqueClickCount`
- `resolvedStatus`

### Billing

#### GET `/v1/workspace/billing`

Read-only public billing summary for the API key workspace.

Visible concepts:

- available balance
- credit balance
- usage counters
- sender verification status when needed for SMS behavior
- whether shared credits are used

Not exposed:

- internal provider reconciliation details
- hidden accounting entries
- non-public operational metadata

## Public Webhooks Emitted By ReachDem

ReachDem V1 may emit the following outbound events:

- `message.queued`
- `message.sent`
- `message.failed`
- `campaign.running`
- `campaign.completed`
- `campaign.failed`

Webhook payload shape:

```json
{
  "id": "evt_123",
  "type": "message.sent",
  "createdAt": "2026-04-12T15:00:00Z",
  "data": {
    "messageId": "msg_123",
    "campaignId": null,
    "channel": "sms",
    "status": "sent"
  }
}
```

Webhook security requirements:

- HMAC-signed payloads
- replay-safe delivery semantics
- retried delivery on transient failure

## Provider Webhooks

Provider webhooks from Flutterwave and Stripe remain inbound infrastructure endpoints handled by ReachDem.

They are not part of the public client integration surface, even if they exist in the deployed application.

## Error Catalog

Minimum normalized public error codes:

- `unauthorized`
- `forbidden`
- `validation_error`
- `not_found`
- `idempotency_conflict`
- `insufficient_balance`
- `campaign_invalid_status`
- `unsupported_channel`
- `rate_limited`
- `internal_error`

## Non-Scope V1

- `inline_list` campaign audience
- automatic system contact creation such as `cust_*`
- audience snapshot-at-schedule behavior
- hardcoded pricing in the public spec
- email attachments
- templating variables in the public send contract
- public distinction between `accepted` and `delivered` before domain normalization
- exposing payment checkout internals as public API resources

## V2 Candidates

- richer message retrieval and delivery timeline
- attachment support for email
- templating variables
- audience snapshot modes
- public webhook management endpoints
- public API key management endpoints
- stronger filtering and exports for campaigns and messages

## Alignment Notes

This contract intentionally abstracts over current internal route shapes where needed.

Internal implementation may continue to use:

- session-based dashboard guards
- separate internal send routes for SMS and email
- internal payment orchestration endpoints
- internal provider and worker coordination

Those internal surfaces do not define the public V1 contract by themselves.
