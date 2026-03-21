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
  smsWorkerConfig,
} from "./config";
import { handleCampaignLaunchBatch } from "./campaign-launch";
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
          campaignWorkerConfig.queueName,
          smsWorkerConfig.queueName,
          emailWorkerConfig.queueName,
        ],
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
      case campaignWorkerConfig.queueName:
        await handleCampaignLaunchBatch(
          batch as MessageBatch<CampaignLaunchMessage>,
          env
        );
        break;
      case smsWorkerConfig.queueName:
        await handleSmsBatch(batch as MessageBatch<SmsMessage>, env);
        break;
      case emailWorkerConfig.queueName:
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

    console.log(
      `[Queue API] Enqueueing SMS message ${body.message_id} cycle ${body.delivery_cycle} into ${smsWorkerConfig.queueName}`
    );
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

    console.log(
      `[Queue API] Enqueueing campaign launch ${body.campaign_id} into ${campaignWorkerConfig.queueName}`
    );
    await env.CAMPAIGN_LAUNCH_QUEUE.send(body);
    return Response.json({
      success: true,
      message: "Campaign launch job queued",
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

    console.log(
      `[Queue API] Enqueueing email message ${body.message_id} cycle ${body.delivery_cycle} into ${emailWorkerConfig.queueName}`
    );
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
