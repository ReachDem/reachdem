import type { MessageExecutionJob } from "@reachdem/shared";
import {
  emailWorkerConfig,
  scheduledWorkerConfig,
  smsWorkerConfig,
} from "./config";
import { requireScheduledWorkerEnv } from "./env";
import type { Env, ScheduledController } from "./types";

interface ScheduledMessageResponse {
  updated?: number;
  items: Array<{
    id: string;
    organizationId: string;
    channel: "sms" | "email";
  }>;
}

export async function handleScheduled(
  controller: ScheduledController,
  env: Env
): Promise<void> {
  requireScheduledWorkerEnv(env);
  const scheduledTime = new Date(controller.scheduledTime);

  console.log(
    `[Cron] Triggered: "${controller.cron}" at ${scheduledTime.toISOString()}`
  );

  switch (controller.cron) {
    case scheduledWorkerConfig.cron:
      await handleScheduledMessages(env, scheduledTime);
      break;
    default:
      console.warn(`[Cron] Unknown cron pattern: ${controller.cron}`);
  }
}

async function handleScheduledMessages(
  env: Env,
  scheduledTime: Date
): Promise<void> {
  const response = await fetch(
    `${env.API_BASE_URL}/api/internal/messages/scheduled`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({
        until: scheduledTime.toISOString(),
        smsLimit: scheduledWorkerConfig.smsClaimBatchSize,
        emailLimit: scheduledWorkerConfig.emailClaimBatchSize,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch scheduled messages: HTTP ${response.status}`
    );
  }

  const payload = (await response.json()) as ScheduledMessageResponse;
  console.log(
    `[Cron] Claimed ${payload.updated ?? payload.items.length} scheduled message(s)`
  );

  if (payload.items.length === 0) {
    return;
  }

  for (const item of payload.items) {
    const job: MessageExecutionJob =
      item.channel === "sms"
        ? {
            message_id: item.id,
            organization_id: item.organizationId,
            channel: "sms",
            delivery_cycle: 1,
          }
        : {
            message_id: item.id,
            organization_id: item.organizationId,
            channel: "email",
            delivery_cycle: 1,
          };

    if (job.channel === "sms") {
      console.log(
        `[Cron] Publishing scheduled SMS message ${job.message_id} to ${smsWorkerConfig.queueName}`
      );
      await env.SMS_QUEUE.send(job);
    } else {
      console.log(
        `[Cron] Publishing scheduled email message ${job.message_id} to ${emailWorkerConfig.queueName}`
      );
      await env.EMAIL_QUEUE.send(job);
    }
  }

  console.log(`[Cron] Queued ${payload.items.length} scheduled message(s)`);
}
