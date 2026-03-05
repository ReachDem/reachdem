// ─── Activity Logger Types ────────────────────────────────────────────────────

export type ActorType = "user" | "system" | "api_key";

export type EventCategory =
  | "sms"
  | "email"
  | "whatsapp"
  | "contacts"
  | "links"
  | "auth"
  | "billing"
  | "system";

export type EventAction =
  | "send_attempt"
  | "send_success"
  | "send_failed"
  | "fallback"
  | "provider_error"
  | "rate_limit"
  | "created"
  | "updated"
  | "deleted";

export type ResourceType =
  | "message"
  | "campaign"
  | "segment"
  | "group"
  | "contact"
  | "webhook";

export type EventSeverity = "debug" | "info" | "warn" | "error";

export type EventStatus = "success" | "failed" | "pending";

export interface CreateEventInput {
  organizationId: string;
  actorType?: ActorType;
  actorId?: string;
  category: EventCategory;
  action: EventAction;
  resourceType?: ResourceType;
  resourceId?: string;
  provider?: string;
  providerRequestId?: string;
  correlationId?: string; // Auto-generated if absent
  idempotencyKey?: string;
  severity?: EventSeverity;
  status: EventStatus;
  durationMs?: number;
  meta?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface CreateProviderCallInput {
  organizationId: string;
  activityEventId: string;
  provider: string;
  endpoint: string; // Masked path only — never raw provider URL
  method: string;
  requestMeta?: Record<string, unknown>;
  responseMeta?: Record<string, unknown>;
  httpStatus?: number;
  errorCode?: string;
  errorMessage?: string;
  durationMs: number;
}

export interface ListEventsOptions {
  category?: EventCategory;
  severity?: EventSeverity;
  status?: EventStatus;
  provider?: string;
  resourceId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
}

export interface ProviderSummaryResult {
  provider: string | null;
  totalCalls: number;
  avgDurationMs: number | null;
  errorCount: number;
  fallbackCount: number;
}
