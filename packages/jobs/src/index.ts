import { z } from "zod";
import type {
  CampaignLaunchJob,
  EmailExecutionJob,
  MessageExecutionJob,
  SmsExecutionJob,
  WhatsAppExecutionJob,
} from "@reachdem/shared";

export const workerEnvironmentSchema = z.enum([
  "development",
  "staging",
  "production",
]);

export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;

export const workerDomains = [
  "campaign",
  "sms",
  "email",
  "whatsapp",
  "scheduler",
] as const;

export type WorkerDomain = (typeof workerDomains)[number];

export const messageDeliveryCycleSchema = z
  .number()
  .int()
  .min(1, "delivery_cycle must be >= 1")
  .max(50, "delivery_cycle is unexpectedly high");

export const smsExecutionJobSchema = z.object({
  message_id: z.string().min(1),
  organization_id: z.string().min(1),
  channel: z.literal("sms"),
  delivery_cycle: messageDeliveryCycleSchema,
}) satisfies z.ZodType<SmsExecutionJob>;

export const emailExecutionJobSchema = z.object({
  message_id: z.string().min(1),
  organization_id: z.string().min(1),
  channel: z.literal("email"),
  delivery_cycle: messageDeliveryCycleSchema,
}) satisfies z.ZodType<EmailExecutionJob>;

export const whatsAppExecutionJobSchema = z.object({
  message_id: z.string().min(1),
  organization_id: z.string().min(1),
  channel: z.literal("whatsapp"),
  delivery_cycle: messageDeliveryCycleSchema,
}) satisfies z.ZodType<WhatsAppExecutionJob>;

export const campaignLaunchJobSchema = z.object({
  campaign_id: z.string().min(1),
  organization_id: z.string().min(1),
}) satisfies z.ZodType<CampaignLaunchJob>;

export const messageExecutionJobSchema = z.discriminatedUnion("channel", [
  smsExecutionJobSchema,
  emailExecutionJobSchema,
  whatsAppExecutionJobSchema,
]) satisfies z.ZodType<MessageExecutionJob>;

export const jobSchemas = {
  campaign: campaignLaunchJobSchema,
  sms: smsExecutionJobSchema,
  email: emailExecutionJobSchema,
  whatsapp: whatsAppExecutionJobSchema,
} as const;

export type QueueRegistry = Record<
  WorkerEnvironment,
  Record<Exclude<WorkerDomain, "scheduler">, string>
>;

export const queueRegistry = {
  development: {
    campaign: "reachdem-campaign-launch-queue",
    sms: "reachdem-sms-queue",
    email: "reachdem-email-queue",
    whatsapp: "reachdem-whatsapp-queue",
  },
  staging: {
    campaign: "reachdem-campaign-launch-queue-staging",
    sms: "reachdem-sms-queue-staging",
    email: "reachdem-email-queue-staging",
    whatsapp: "reachdem-whatsapp-queue-staging",
  },
  production: {
    campaign: "reachdem-campaign-launch-queue-v2-production",
    sms: "reachdem-sms-queue-v2-production",
    email: "reachdem-email-queue-v2-production",
    whatsapp: "reachdem-whatsapp-queue-v2-production",
  },
} as const satisfies QueueRegistry;

export function parseWorkerEnvironment(value: string | undefined) {
  return workerEnvironmentSchema.catch("development").parse(value);
}

export function getQueueName(
  environment: WorkerEnvironment | string | undefined,
  domain: Exclude<WorkerDomain, "scheduler">
): string {
  const parsedEnvironment = parseWorkerEnvironment(environment);
  return queueRegistry[parsedEnvironment][domain];
}

export function createMessageExecutionJob(
  input: Omit<MessageExecutionJob, "delivery_cycle"> & {
    delivery_cycle?: number;
  }
): MessageExecutionJob {
  return messageExecutionJobSchema.parse({
    ...input,
    delivery_cycle: input.delivery_cycle ?? 1,
  });
}

export function createCampaignLaunchJob(
  input: CampaignLaunchJob
): CampaignLaunchJob {
  return campaignLaunchJobSchema.parse(input);
}
