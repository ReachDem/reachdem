import type { Env, SmsMessage, EmailMessage } from "./types";
import { handleSmsBatch } from "./queue-sms";
import { handleEmailBatch } from "./queue-email";
import { handleScheduled } from "./scheduled";

export default {
  /**
   * HTTP request handler — used to enqueue messages via API.
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

    // Enqueue SMS message
    if (request.method === "POST" && url.pathname === "/queue/sms") {
      return handleEnqueueSms(request, env);
    }

    // Enqueue Email message
    if (request.method === "POST" && url.pathname === "/queue/email") {
      return handleEnqueueEmail(request, env);
    }

    // Queue status (placeholder)
    if (url.pathname === "/queue/status") {
      return Response.json({
        queues: ["reachdem-sms-queue", "reachdem-email-queue"],
        environment: env.ENVIRONMENT,
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },

  /**
   * Queue consumer handler — processes messages from Cloudflare Queues.
   * Cloudflare routes messages to this handler based on the queue name.
   */
  async queue(
    batch: MessageBatch,
    env: Env,
    ctx: ExecutionContext
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
        // Ack all to avoid infinite retries on unknown queues
        for (const msg of batch.messages) {
          msg.ack();
        }
    }
  },

  /**
   * Scheduled (Cron) handler — invoked by Cloudflare cron triggers.
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    await handleScheduled(controller, env);
  },
} satisfies ExportedHandler<Env>;

// ─── HTTP Helpers ────────────────────────────────────────────

async function handleEnqueueSms(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as SmsMessage;

    if (!body.to || !body.body || !body.contactId) {
      return Response.json(
        { error: "Missing required fields: to, body, contactId" },
        { status: 400 }
      );
    }

    await env.SMS_QUEUE.send(body);
    return Response.json({ success: true, message: "SMS queued", to: body.to });
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

    if (!body.to || !body.subject || !body.html || !body.contactId) {
      return Response.json(
        { error: "Missing required fields: to, subject, html, contactId" },
        { status: 400 }
      );
    }

    await env.EMAIL_QUEUE.send(body);
    return Response.json({
      success: true,
      message: "Email queued",
      to: body.to,
    });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
