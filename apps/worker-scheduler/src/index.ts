import { CampaignService, MessageService } from "@reachdem/core";
import {
  configureDatabaseRuntime,
  resetPrismaClient,
} from "@reachdem/database";
import { getQueueName } from "@reachdem/jobs";
import type {
  CampaignLaunchJob,
  EmailExecutionJob,
  MessageExecutionJob,
  SmsExecutionJob,
  WhatsAppExecutionJob,
} from "@reachdem/shared";
import {
  assertInternalRequest,
  createWorkerLogger,
  errorResponse,
  requireStringEnv,
  requireUrlEnv,
  requireWorkerEnvironment,
  sendQueueBatch,
  type ScheduledController,
  type WorkerQueue,
} from "@reachdem/worker-kit";

interface Env extends Record<string, unknown> {
  CAMPAIGN_LAUNCH_QUEUE: WorkerQueue<CampaignLaunchJob>;
  SMS_QUEUE: WorkerQueue<SmsExecutionJob>;
  EMAIL_QUEUE: WorkerQueue<EmailExecutionJob>;
  WHATSAPP_QUEUE: WorkerQueue<WhatsAppExecutionJob>;
  WORKER_ENV: string;
  REACHDEM_WORKER_INTERNAL_SECRET: string;
  DATABASE_URL?: string;
  PRISMA_ACCELERATE_URL?: string;
  SCHEDULER_API_BASE_URL: string;
}

const domain = "scheduler";
const logger = createWorkerLogger(domain);
const cronPattern = "*/5 * * * *";
const campaignClaimBatchSize = 50;
const smsClaimBatchSize = 100;
const emailClaimBatchSize = 50;
const whatsappClaimBatchSize = 40;
const authDeferredEmailBatchSize = 50;

function configureRuntime(env: Env): void {
  resetPrismaClient();
  configureDatabaseRuntime({
    databaseUrl:
      typeof env.DATABASE_URL === "string" ? env.DATABASE_URL : undefined,
    prismaAccelerateUrl:
      typeof env.PRISMA_ACCELERATE_URL === "string"
        ? env.PRISMA_ACCELERATE_URL
        : undefined,
    driver: "neon",
  });
  process.env.DATABASE_URL =
    typeof env.DATABASE_URL === "string" ? env.DATABASE_URL : undefined;
  process.env.PRISMA_ACCELERATE_URL =
    typeof env.PRISMA_ACCELERATE_URL === "string"
      ? env.PRISMA_ACCELERATE_URL
      : undefined;
  process.env.PRISMA_DB_DRIVER = "neon";
}

function requireSchedulerEnv(env: Env): void {
  requireWorkerEnvironment(env, domain);
  requireStringEnv(env, "REACHDEM_WORKER_INTERNAL_SECRET", domain);
  requireUrlEnv(env, "SCHEDULER_API_BASE_URL", domain);
}

async function handleScheduledCampaigns(env: Env, scheduledTime: Date) {
  const payload = await CampaignService.claimScheduledCampaigns({
    until: scheduledTime,
    limit: campaignClaimBatchSize,
  });
  const jobs = payload.items.map((campaign) => ({
    campaign_id: campaign.id,
    organization_id: campaign.organizationId,
  }));

  try {
    await sendQueueBatch(env.CAMPAIGN_LAUNCH_QUEUE, jobs);
  } catch (error) {
    logger.error("scheduler.campaign.publish_failed", { error });
    for (const campaign of payload.items) {
      await CampaignService.revertScheduledCampaignClaim(campaign.id);
    }
    throw error;
  }

  logger.info("scheduler.campaign.published", { count: jobs.length });
}

async function handleScheduledMessages(env: Env, scheduledTime: Date) {
  const payload = await MessageService.claimScheduledMessages({
    until: scheduledTime,
    smsLimit: smsClaimBatchSize,
    emailLimit: emailClaimBatchSize,
    whatsappLimit: whatsappClaimBatchSize,
  });

  const smsJobs: SmsExecutionJob[] = [];
  const emailJobs: EmailExecutionJob[] = [];
  const whatsAppJobs: WhatsAppExecutionJob[] = [];

  for (const item of payload.items) {
    const job: MessageExecutionJob = {
      message_id: item.id,
      organization_id: item.organizationId,
      channel: item.channel,
      delivery_cycle: 1,
    } as MessageExecutionJob;

    if (job.channel === "sms") smsJobs.push(job);
    if (job.channel === "email") emailJobs.push(job);
    if (job.channel === "whatsapp") whatsAppJobs.push(job);
  }

  try {
    await sendQueueBatch(env.SMS_QUEUE, smsJobs);
    await sendQueueBatch(env.EMAIL_QUEUE, emailJobs);
    await sendQueueBatch(env.WHATSAPP_QUEUE, whatsAppJobs);
  } catch (error) {
    logger.error("scheduler.messages.publish_failed", { error });
    for (const item of payload.items) {
      await MessageService.revertScheduledMessageClaim(item.id);
    }
    throw error;
  }

  logger.info("scheduler.messages.published", {
    sms: smsJobs.length,
    email: emailJobs.length,
    whatsapp: whatsAppJobs.length,
  });
}

async function handleDeferredAuthEmails(env: Env, scheduledTime: Date) {
  const endpoint = new URL(
    "/api/internal/auth/deferred-emails/process",
    requireUrlEnv(env, "SCHEDULER_API_BASE_URL", domain)
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": env.REACHDEM_WORKER_INTERNAL_SECRET,
    },
    body: JSON.stringify({
      until: scheduledTime.toISOString(),
      limit: authDeferredEmailBatchSize,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Deferred auth email processing failed (${response.status}): ${responseText}`
    );
  }

  logger.info("scheduler.deferred_auth.processed", await response.json());
}

async function runScheduledTasks(env: Env, scheduledTime: Date) {
  const tasks = [
    handleScheduledCampaigns(env, scheduledTime),
    handleScheduledMessages(env, scheduledTime),
    handleDeferredAuthEmails(env, scheduledTime),
  ];
  const results = await Promise.allSettled(tasks);
  const failures = results.filter((result) => result.status === "rejected");

  if (failures.length > 0) {
    throw new Error(`${failures.length} scheduled task(s) failed`);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      configureRuntime(env);
      const workerEnv = requireWorkerEnvironment(env, domain);
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return Response.json({
          status: "ok",
          worker: domain,
          environment: workerEnv,
          cron: cronPattern,
          checkedAt: new Date().toISOString(),
        });
      }

      requireSchedulerEnv(env);
      assertInternalRequest(request, env, domain);

      if (url.pathname === "/queue/status") {
        return Response.json({
          worker: domain,
          environment: workerEnv,
          queues: {
            campaign: getQueueName(workerEnv, "campaign"),
            sms: getQueueName(workerEnv, "sms"),
            email: getQueueName(workerEnv, "email"),
            whatsapp: getQueueName(workerEnv, "whatsapp"),
          },
        });
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      logger.error("fetch.failed", { error });
      return errorResponse(error);
    }
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    configureRuntime(env);
    requireSchedulerEnv(env);
    if (controller.cron !== cronPattern) {
      logger.warn("scheduler.unknown_cron", { cron: controller.cron });
      return;
    }

    await runScheduledTasks(env, new Date(controller.scheduledTime));
  },
};
