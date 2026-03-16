import type { MessageExecutionJob } from "@reachdem/shared";
import type { Env, ScheduledController } from "./types";

interface ScheduledMessageResponse {
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
  const scheduledTime = new Date(controller.scheduledTime);

  console.log(
    `[Cron] Triggered: "${controller.cron}" at ${scheduledTime.toISOString()}`
  );

  switch (controller.cron) {
    case "* * * * *":
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
    `${env.API_BASE_URL}/api/internal/messages/scheduled?until=${encodeURIComponent(scheduledTime.toISOString())}`,
    {
      headers: {
        "x-internal-secret": env.INTERNAL_API_SECRET,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch scheduled messages: HTTP ${response.status}`
    );
  }

  const payload = (await response.json()) as ScheduledMessageResponse;
  console.log(`[Cron] Found ${payload.items.length} scheduled message(s)`);

  if (payload.items.length === 0) {
    return;
  }

  const updateResponse = await fetch(
    `${env.API_BASE_URL}/api/internal/messages/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({
        ids: payload.items.map((item) => item.id),
        status: "queued",
      }),
    }
  );

  if (!updateResponse.ok) {
    throw new Error(
      `Failed to update scheduled message statuses: HTTP ${updateResponse.status}`
    );
  }

  const updatedPayload = (await updateResponse.json()) as {
    updated: number;
    ids: string[];
  };
  const queueableIds = new Set(updatedPayload.ids);

  for (const item of payload.items) {
    if (!queueableIds.has(item.id)) continue;

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
      await env.SMS_QUEUE.send(job);
    } else {
      await env.EMAIL_QUEUE.send(job);
    }
  }

  console.log(`[Cron] Queued ${updatedPayload.updated} scheduled message(s)`);
}
