import { ProcessEmailMessageJobUseCase } from "@reachdem/core";
import {
  configureDatabaseRuntime,
  resetPrismaClient,
} from "@reachdem/database";
import { emailExecutionJobSchema, getQueueName } from "@reachdem/jobs";
import type { EmailExecutionJob } from "@reachdem/shared";
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
import {
  AlibabaDirectMailError,
  sendAlibabaDirectMail,
} from "../../workers/src/alibaba-direct-mail";

interface Env extends Record<string, unknown> {
  EMAIL_QUEUE: WorkerQueue<EmailExecutionJob>;
  WORKER_ENV: string;
  REACHDEM_WORKER_INTERNAL_SECRET: string;
  DATABASE_URL?: string;
  PRISMA_ACCELERATE_URL?: string;
  EMAIL_ALIBABA_ACCESS_KEY_ID: string;
  EMAIL_ALIBABA_ACCESS_KEY_SECRET: string;
  EMAIL_ALIBABA_REGION?: string;
  EMAIL_SENDER_ADDRESS: string;
  EMAIL_SENDER_NAME: string;
}

const domain = "email";
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
  process.env.ALIBABA_ACCESS_KEY_ID = env.EMAIL_ALIBABA_ACCESS_KEY_ID;
  process.env.ALIBABA_ACCESS_KEY_SECRET = env.EMAIL_ALIBABA_ACCESS_KEY_SECRET;
  process.env.ALIBABA_REGION = env.EMAIL_ALIBABA_REGION;
  process.env.ALIBABA_SENDER_EMAIL = env.EMAIL_SENDER_ADDRESS;
  process.env.ALIBABA_SENDER_NAME = env.EMAIL_SENDER_NAME;
  process.env.SENDER_EMAIL = env.EMAIL_SENDER_ADDRESS;
  process.env.SENDER_NAME = env.EMAIL_SENDER_NAME;
}

function requireEmailEnv(env: Env): void {
  requireWorkerEnvironment(env, domain);
  requireStringEnv(env, "REACHDEM_WORKER_INTERNAL_SECRET", domain);
  requireStringEnv(env, "EMAIL_ALIBABA_ACCESS_KEY_ID", domain);
  requireStringEnv(env, "EMAIL_ALIBABA_ACCESS_KEY_SECRET", domain);
  requireStringEnv(env, "EMAIL_SENDER_ADDRESS", domain);
  requireStringEnv(env, "EMAIL_SENDER_NAME", domain);
}

async function handleEmailJob(job: EmailExecutionJob, env: Env) {
  return ProcessEmailMessageJobUseCase.execute(job, {
    maxDeliveryCycles,
    republish: (nextJob) => env.EMAIL_QUEUE.send(nextJob),
    sendEmail: async ({ to, subject, html, from }) => {
      const startedAt = Date.now();
      try {
        const result = await sendAlibabaDirectMail(
          { to, subject, html, fromName: from },
          {
            ALIBABA_ACCESS_KEY_ID: env.EMAIL_ALIBABA_ACCESS_KEY_ID,
            ALIBABA_ACCESS_KEY_SECRET: env.EMAIL_ALIBABA_ACCESS_KEY_SECRET,
            ALIBABA_REGION: env.EMAIL_ALIBABA_REGION,
            ALIBABA_SENDER_EMAIL: env.EMAIL_SENDER_ADDRESS,
            ALIBABA_SENDER_NAME: env.EMAIL_SENDER_NAME,
            SENDER_EMAIL: env.EMAIL_SENDER_ADDRESS,
            SENDER_NAME: env.EMAIL_SENDER_NAME,
          } as never
        );

        return {
          success: true,
          providerName: result.providerName,
          providerMessageId: result.providerMessageId,
          durationMs: Date.now() - startedAt,
        };
      } catch (error) {
        return {
          success: false,
          providerName: "alibaba-direct-mail",
          errorCode:
            error instanceof AlibabaDirectMailError
              ? (error.providerCode ?? "ALIBABA_DIRECT_MAIL_FAILED")
              : "ALIBABA_DIRECT_MAIL_FAILED",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Unknown Alibaba Direct Mail error",
          durationMs: Date.now() - startedAt,
        };
      }
    },
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

      requireEmailEnv(env);
      assertInternalRequest(request, env, domain);

      if (request.method === "POST" && url.pathname === "/queue/email") {
        const job = await parseJsonWithSchema(request, emailExecutionJobSchema);
        await env.EMAIL_QUEUE.send(job);
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

  async queue(batch: QueueBatch<EmailExecutionJob>, env: Env): Promise<void> {
    configureRuntime(env);
    requireEmailEnv(env);
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
      handler: (message) => handleEmailJob(message.body, env),
    });
  },
};
