import { ProcessSmsMessageJobUseCase } from "@reachdem/core";
import {
  configureDatabaseRuntime,
  resetPrismaClient,
} from "@reachdem/database";
import { getQueueName, smsExecutionJobSchema } from "@reachdem/jobs";
import type { SmsExecutionJob } from "@reachdem/shared";
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
  SMS_QUEUE: WorkerQueue<SmsExecutionJob>;
  WORKER_ENV: string;
  REACHDEM_WORKER_INTERNAL_SECRET: string;
  DATABASE_URL?: string;
  PRISMA_ACCELERATE_URL?: string;
  SMS_AVLYTEXT_API_KEY: string;
  SMS_MBOA_USER_ID: string;
  SMS_MBOA_API_PASSWORD: string;
  SMS_LMT_API_KEY?: string;
  SMS_LMT_SECRET?: string;
}

const domain = "sms";
const logger = createWorkerLogger(domain);
const maxDeliveryCycles = 3;

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
  process.env.AVLYTEXT_API_KEY = env.SMS_AVLYTEXT_API_KEY;
  process.env.MBOA_SMS_USERID = env.SMS_MBOA_USER_ID;
  process.env.MBOA_SMS_API_PASSWORD = env.SMS_MBOA_API_PASSWORD;
  process.env.LMT_API_KEY = env.SMS_LMT_API_KEY;
  process.env.LMT_SECRET = env.SMS_LMT_SECRET;
}

function requireSmsEnv(env: Env): void {
  requireWorkerEnvironment(env, domain);
  requireStringEnv(env, "REACHDEM_WORKER_INTERNAL_SECRET", domain);
  requireStringEnv(env, "SMS_AVLYTEXT_API_KEY", domain);
  requireStringEnv(env, "SMS_MBOA_USER_ID", domain);
  requireStringEnv(env, "SMS_MBOA_API_PASSWORD", domain);
}

async function handleSmsJob(job: SmsExecutionJob, env: Env) {
  return ProcessSmsMessageJobUseCase.execute(job, {
    maxDeliveryCycles,
    republish: (nextJob) => env.SMS_QUEUE.send(nextJob),
  });
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

      requireSmsEnv(env);
      assertInternalRequest(request, env, domain);

      if (request.method === "POST" && url.pathname === "/queue/sms") {
        const job = await parseJsonWithSchema(request, smsExecutionJobSchema);
        await env.SMS_QUEUE.send(job);
        return Response.json({ success: true, worker: domain });
      }

      if (url.pathname === "/queue/status") {
        return Response.json({
          worker: domain,
          environment: workerEnv,
          queue: getQueueName(workerEnv, domain),
        });
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      logger.error("fetch.failed", { error });
      return errorResponse(error);
    }
  },

  async queue(batch: QueueBatch<SmsExecutionJob>, env: Env): Promise<void> {
    configureRuntime(env);
    requireSmsEnv(env);
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
      handler: (message) => handleSmsJob(message.body, env),
    });
  },
};
