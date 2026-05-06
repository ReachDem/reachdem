import { ProcessWhatsAppMessageJobUseCase } from "@reachdem/core";
import {
  configureDatabaseRuntime,
  resetPrismaClient,
} from "@reachdem/database";
import { getQueueName, whatsAppExecutionJobSchema } from "@reachdem/jobs";
import type { WhatsAppExecutionJob } from "@reachdem/shared";
import {
  assertInternalRequest,
  createWorkerLogger,
  errorResponse,
  parseJsonWithSchema,
  processQueueBatch,
  requireStringEnv,
  requireUrlEnv,
  requireWorkerEnvironment,
  type QueueBatch,
  type WorkerQueue,
} from "@reachdem/worker-kit";

interface Env extends Record<string, unknown> {
  WHATSAPP_QUEUE: WorkerQueue<WhatsAppExecutionJob>;
  WORKER_ENV: string;
  REACHDEM_WORKER_INTERNAL_SECRET: string;
  DATABASE_URL?: string;
  PRISMA_ACCELERATE_URL?: string;
  WHATSAPP_EVOLUTION_API_BASE_URL: string;
  WHATSAPP_EVOLUTION_API_KEY: string;
  WHATSAPP_EVOLUTION_INSTANCE_PREFIX?: string;
}

const domain = "whatsapp";
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
  process.env.EVOLUTION_API_BASE_URL = env.WHATSAPP_EVOLUTION_API_BASE_URL;
  process.env.EVOLUTION_API_KEY = env.WHATSAPP_EVOLUTION_API_KEY;
  process.env.EVOLUTION_INSTANCE_PREFIX =
    env.WHATSAPP_EVOLUTION_INSTANCE_PREFIX;
}

function requireWhatsAppEnv(env: Env): void {
  requireWorkerEnvironment(env, domain);
  requireStringEnv(env, "REACHDEM_WORKER_INTERNAL_SECRET", domain);
  requireUrlEnv(env, "WHATSAPP_EVOLUTION_API_BASE_URL", domain);
  requireStringEnv(env, "WHATSAPP_EVOLUTION_API_KEY", domain);
}

async function handleWhatsAppJob(job: WhatsAppExecutionJob, env: Env) {
  return ProcessWhatsAppMessageJobUseCase.execute(job, {
    maxDeliveryCycles,
    republish: (nextJob) => env.WHATSAPP_QUEUE.send(nextJob),
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

      requireWhatsAppEnv(env);
      assertInternalRequest(request, env, domain);

      if (request.method === "POST" && url.pathname === "/queue/whatsapp") {
        const job = await parseJsonWithSchema(
          request,
          whatsAppExecutionJobSchema
        );
        await env.WHATSAPP_QUEUE.send(job);
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

  async queue(
    batch: QueueBatch<WhatsAppExecutionJob>,
    env: Env
  ): Promise<void> {
    configureRuntime(env);
    requireWhatsAppEnv(env);
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
      handler: (message) => handleWhatsAppJob(message.body, env),
    });
  },
};
