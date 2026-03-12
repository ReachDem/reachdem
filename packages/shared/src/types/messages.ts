// ─── SMS Message Types ────────────────────────────────────────────────────────

export type MessageStatus = "queued" | "sending" | "sent" | "failed";
export type AttemptStatus = "queued" | "sent" | "failed";
export type MessageChannel = "sms";

export interface SendSmsInput {
  to: string; // E.164 format
  text: string;
  from: string; // Sender ID
  idempotency_key: string;
  campaignId?: string;
}

export interface SendSmsResult {
  message_id: string;
  status: MessageStatus;
  correlation_id: string;
  idempotent: boolean; // true if this was a duplicate idempotent request
}

export interface SmsExecutionJob {
  message_id: string;
  organization_id: string;
  channel: MessageChannel;
  delivery_cycle: number;
}

export interface ListMessagesOptions {
  status?: MessageStatus;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
}

export interface MessageAttemptDto {
  id: string;
  provider: string;
  attemptNo: number;
  status: AttemptStatus;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number;
  createdAt: Date;
}

export interface MessageDto {
  id: string;
  campaignId?: string | null;
  channel: MessageChannel;
  toLast4: string;
  from: string;
  status: MessageStatus;
  providerSelected: string | null;
  correlationId: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageWithAttemptsDto extends MessageDto {
  attempts: MessageAttemptDto[];
}
