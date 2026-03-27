import type {
  CampaignLaunchJob,
  EmailExecutionJob,
  SmsExecutionJob,
} from "@reachdem/shared";

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
  CAMPAIGN_LAUNCH_QUEUE: QueueProducer<CampaignLaunchJob>;
  SMS_QUEUE: QueueProducer<SmsExecutionJob>;
  EMAIL_QUEUE: QueueProducer<EmailExecutionJob>;
  DATABASE_URL?: string;
  PRISMA_ACCELERATE_URL?: string;
  ENVIRONMENT: string;
  API_BASE_URL: string;
  INTERNAL_API_SECRET: string;
  ALIBABA_ACCESS_KEY_ID?: string;
  ALIBABA_ACCESS_KEY_SECRET?: string;
  ALIBABA_REGION?: string;
  ALIBABA_SENDER_EMAIL?: string;
  ALIBABA_SENDER_NAME?: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_SECURE: string;
  SENDER_EMAIL: string;
  SENDER_NAME: string;
}

export type SmsMessage = SmsExecutionJob;
export type EmailMessage = EmailExecutionJob;
export type CampaignLaunchMessage = CampaignLaunchJob;
