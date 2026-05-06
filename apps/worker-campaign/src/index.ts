import { ProcessCampaignLaunchJobUseCase } from "@reachdem/core";
import {
  configureDatabaseRuntime,
  resetPrismaClient,
} from "@reachdem/database";
import { campaignLaunchJobSchema, getQueueName } from "@reachdem/jobs";
import type {
  CampaignLaunchJob,
  EmailExecutionJob,
  SmsExecutionJob,
  WhatsAppExecutionJob,
} from "@reachdem/shared";
import {
  assertInternalRequest,
  createWorkerLogger,
  errorResponse,
  parseJsonWithSchema,
  processQueueBatch,
  requireStringEnv,
  requireWorkerEnvironment,
  type QueueBatch,
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
}

const domain = "campaign";
const logger = createWorkerLogger(domain);

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

function requireCampaignEnv(env: Env): void {
  requireWorkerEnvironment(env, domain);
  requireStringEnv(env, "REACHDEM_WORKER_INTERNAL_SECRET", domain);
}

async function handleCampaignJob(job: CampaignLaunchJob, env: Env) {
  return ProcessCampaignLaunchJobUseCase.execute(
    job,
    (smsJob) => env.SMS_QUEUE.send(smsJob),
    (emailJob) => env.EMAIL_QUEUE.send(emailJob),
    (whatsAppJob) => env.WHATSAPP_QUEUE.send(whatsAppJob)
  );
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
          queue: getQueueName(workerEnv, domain),
          checkedAt: new Date().toISOString(),
        });
      }

      requireCampaignEnv(env);
      assertInternalRequest(request, env, domain);

      if (
        request.method === "POST" &&
        url.pathname === "/queue/campaign-launch"
      ) {
        const job = await parseJsonWithSchema(request, campaignLaunchJobSchema);
        await env.CAMPAIGN_LAUNCH_QUEUE.send(job);
        return Response.json({ success: true, worker: domain });
      }

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

  async queue(batch: QueueBatch<CampaignLaunchJob>, env: Env): Promise<void> {
    configureRuntime(env);
    requireCampaignEnv(env);
    const workerEnv = requireWorkerEnvironment(env, domain);
    const expectedQueue = getQueueName(workerEnv, domain);
    if (batch.queue !== expectedQueue) {
      throw new Error(
        `Unexpected queue ${batch.queue}; expected ${expectedQueue}`
      );
    }

    await processQueueBatch({
      batch,
      logger,
      handler: (message) => handleCampaignJob(message.body, env),
    });
  },
};
