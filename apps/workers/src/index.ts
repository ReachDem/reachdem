import type {
  CampaignLaunchMessage,
  EmailMessage,
  Env,
  ExecutionContext,
  MessageBatch,
  ScheduledController,
  SmsMessage,
} from "./types";
import {
  campaignWorkerConfig,
  emailWorkerConfig,
  getCampaignLaunchQueueName,
  getEmailQueueName,
  getSmsQueueName,
  smsWorkerConfig,
} from "./config";
import { handleCampaignLaunchBatch } from "./campaign-launch";
import { handleSmsBatch } from "./queue-sms";
import { handleEmailBatch } from "./queue-email";
import { handleScheduled } from "./scheduled";

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function workerRuntimeSummary(env: Env) {
  return {
    environment: env.ENVIRONMENT,
    queues: {
      campaignLaunch: getCampaignLaunchQueueName(env.ENVIRONMENT),
      sms: getSmsQueueName(env.ENVIRONMENT),
      email: getEmailQueueName(env.ENVIRONMENT),
    },
  };
}

function configureWorkerDatabase(env: Env) {
  if (env.DATABASE_URL) {
    process.env.DATABASE_URL = env.DATABASE_URL;
  }

  if (env.PRISMA_ACCELERATE_URL) {
    process.env.PRISMA_ACCELERATE_URL = env.PRISMA_ACCELERATE_URL;
  }

  process.env.PRISMA_DB_DRIVER = "neon";
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    configureWorkerDatabase(env);
    const url = new URL(request.url);
    console.log("[Worker Fetch] Incoming request", {
      method: request.method,
      pathname: url.pathname,
      ...workerRuntimeSummary(env),
    });

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        ...workerRuntimeSummary(env),
      });
    }

    if (request.method === "POST" && url.pathname === "/queue/sms") {
      return handleEnqueueSms(request, env);
    }

    if (
      request.method === "POST" &&
      url.pathname === "/queue/campaign-launch"
    ) {
      return handleEnqueueCampaignLaunch(request, env);
    }

    if (request.method === "POST" && url.pathname === "/queue/email") {
      return handleEnqueueEmail(request, env);
    }

    if (url.pathname === "/queue/status") {
      return Response.json({
        queues: [
          getCampaignLaunchQueueName(env.ENVIRONMENT),
          getSmsQueueName(env.ENVIRONMENT),
          getEmailQueueName(env.ENVIRONMENT),
        ],
        environment: env.ENVIRONMENT,
      });
    }

    console.warn("[Worker Fetch] Unknown route", {
      method: request.method,
      pathname: url.pathname,
    });
    return Response.json({ error: "Not found" }, { status: 404 });
  },

  async queue(
    batch: MessageBatch,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    configureWorkerDatabase(env);
    console.log("[Queue] Received batch", {
      queue: batch.queue,
      size: batch.messages.length,
      ...workerRuntimeSummary(env),
    });

    switch (batch.queue) {
      case getCampaignLaunchQueueName(env.ENVIRONMENT):
        await handleCampaignLaunchBatch(
          batch as MessageBatch<CampaignLaunchMessage>,
          env
        );
        break;
      case getSmsQueueName(env.ENVIRONMENT):
        await handleSmsBatch(batch as MessageBatch<SmsMessage>, env);
        break;
      case getEmailQueueName(env.ENVIRONMENT):
        await handleEmailBatch(batch as MessageBatch<EmailMessage>, env);
        break;
      default:
        console.error("[Queue] Unknown queue", {
          queue: batch.queue,
          size: batch.messages.length,
        });
        for (const msg of batch.messages) {
          msg.ack();
        }
    }
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    configureWorkerDatabase(env);
    console.log("[Worker Scheduled] Trigger received", {
      cron: controller.cron,
      scheduledTime: new Date(controller.scheduledTime).toISOString(),
      ...workerRuntimeSummary(env),
    });
    await handleScheduled(controller, env);
  },
};

async function handleEnqueueSms(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as SmsMessage;

    if (!body.message_id || !body.organization_id || !body.channel) {
      return Response.json(
        {
          error:
            "Missing required fields: message_id, organization_id, channel",
        },
        { status: 400 }
      );
    }

    console.log("[Queue API] Enqueueing SMS job", {
      messageId: body.message_id,
      organizationId: body.organization_id,
      channel: body.channel,
      deliveryCycle: body.delivery_cycle,
      queue: smsWorkerConfig.queueName,
      resolvedQueue: getSmsQueueName(env.ENVIRONMENT),
      environment: env.ENVIRONMENT,
    });
    await env.SMS_QUEUE.send(body);
    return Response.json({
      success: true,
      message: "SMS job queued",
      job: body,
    });
  } catch (error) {
    console.error(
      "[Queue API] Failed to enqueue SMS job",
      serializeError(error)
    );
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

async function handleEnqueueCampaignLaunch(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as CampaignLaunchMessage;

    if (!body.campaign_id || !body.organization_id) {
      return Response.json(
        {
          error: "Missing required fields: campaign_id, organization_id",
        },
        { status: 400 }
      );
    }

    console.log("[Queue API] Enqueueing campaign launch job", {
      campaignId: body.campaign_id,
      organizationId: body.organization_id,
      queue: campaignWorkerConfig.queueName,
      resolvedQueue: getCampaignLaunchQueueName(env.ENVIRONMENT),
      environment: env.ENVIRONMENT,
    });
    await env.CAMPAIGN_LAUNCH_QUEUE.send(body);
    return Response.json({
      success: true,
      message: "Campaign launch job queued",
      job: body,
    });
  } catch (error) {
    console.error(
      "[Queue API] Failed to enqueue campaign launch job",
      serializeError(error)
    );
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

async function handleEnqueueEmail(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as EmailMessage;

    if (!body.message_id || !body.organization_id || !body.channel) {
      return Response.json(
        {
          error:
            "Missing required fields: message_id, organization_id, channel",
        },
        { status: 400 }
      );
    }

    console.log("[Queue API] Enqueueing email job", {
      messageId: body.message_id,
      organizationId: body.organization_id,
      channel: body.channel,
      deliveryCycle: body.delivery_cycle,
      queue: emailWorkerConfig.queueName,
      resolvedQueue: getEmailQueueName(env.ENVIRONMENT),
      environment: env.ENVIRONMENT,
    });
    await env.EMAIL_QUEUE.send(body);
    return Response.json({
      success: true,
      message: "Email job queued",
      job: body,
    });
  } catch (error) {
    console.error(
      "[Queue API] Failed to enqueue email job",
      serializeError(error)
    );
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
