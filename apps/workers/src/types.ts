// Type definitions for the worker environment bindings
export interface Env {
  // Queue producers - used to send messages
  SMS_QUEUE: Queue<SmsMessage>;
  EMAIL_QUEUE: Queue<EmailMessage>;

  // Environment variables
  ENVIRONMENT: string;

  // SMTP config (from .dev.vars locally, from secrets in production)
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_SECURE: string;
  SENDER_EMAIL: string;
  SENDER_NAME: string;
}

// ─── Queue Message Types ─────────────────────────────────────

export interface SmsMessage {
  to: string;
  body: string;
  contactId: string;
  campaignId?: string;
  scheduledAt?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  contactId: string;
  campaignId?: string;
  scheduledAt?: string;
}

export type QueueMessage = SmsMessage | EmailMessage;
