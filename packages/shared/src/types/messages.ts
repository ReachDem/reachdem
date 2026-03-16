// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageStatus =
  | "scheduled"
  | "queued"
  | "sending"
  | "sent"
  | "failed";
export type AttemptStatus = "queued" | "sent" | "failed";
export type MessageChannel = "sms" | "email";

export interface SendSmsInput {
  to: string; // E.164 format
  text: string;
  from: string; // Sender ID
  idempotency_key: string;
  campaignId?: string;
  scheduledAt?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
  idempotency_key: string;
  campaignId?: string;
  scheduledAt?: string;
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
  channel: "sms";
  delivery_cycle: number;
}

export interface EmailExecutionJob {
  message_id: string;
  organization_id: string;
  channel: "email";
  delivery_cycle: number;
}

export type MessageExecutionJob = SmsExecutionJob | EmailExecutionJob;

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
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageWithAttemptsDto extends MessageDto {
  attempts: MessageAttemptDto[];
}
