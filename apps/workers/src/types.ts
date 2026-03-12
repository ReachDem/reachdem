import type { SmsExecutionJob } from "@reachdem/shared";

export interface QueueProducer<T> {
  send(message: T): Promise<void>;
}

export interface QueueMessageEnvelope<T> {
  body: T;
  ack(): void;
  retry(): void;
}

export interface MessageBatch<T = unknown> {
  queue: string;
  messages: Array<QueueMessageEnvelope<T>>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

export interface Env {
  SMS_QUEUE: QueueProducer<SmsExecutionJob>;
  EMAIL_QUEUE: QueueProducer<EmailMessage>;
  ENVIRONMENT: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_SECURE: string;
  SENDER_EMAIL: string;
  SENDER_NAME: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  contactId: string;
  campaignId?: string;
  scheduledAt?: string;
}

export type SmsMessage = SmsExecutionJob;
