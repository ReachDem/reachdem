import type {
  EmailMessage,
  Env,
  ExecutionContext,
  MessageBatch,
  ScheduledController,
  SmsMessage,
} from "./types";
import { handleSmsBatch } from "./queue-sms";
import { handleEmailBatch } from "./queue-email";
import { handleScheduled } from "./scheduled";

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

    if (request.method === "POST" && url.pathname === "/queue/sms") {
      return handleEnqueueSms(request, env);
    }

    if (request.method === "POST" && url.pathname === "/queue/email") {
      return handleEnqueueEmail(request, env);
    }

    if (url.pathname === "/queue/status") {
      return Response.json({
        queues: ["reachdem-sms-queue", "reachdem-email-queue"],
        environment: env.ENVIRONMENT,
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },

  async queue(
    batch: MessageBatch,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    console.log(`[Queue] Received batch from queue: ${batch.queue}`);

    switch (batch.queue) {
      case "reachdem-sms-queue":
        await handleSmsBatch(batch as MessageBatch<SmsMessage>, env);
        break;
      case "reachdem-email-queue":
        await handleEmailBatch(batch as MessageBatch<EmailMessage>, env);
        break;
      default:
        console.error(`[Queue] Unknown queue: ${batch.queue}`);
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

    await env.SMS_QUEUE.send(body);
    return Response.json({
      success: true,
      message: "SMS job queued",
      job: body,
    });
  } catch {
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

    await env.EMAIL_QUEUE.send(body);
    return Response.json({
      success: true,
      message: "Email job queued",
      job: body,
    });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
