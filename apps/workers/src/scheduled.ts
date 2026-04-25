import { CampaignService, MessageService } from "@reachdem/core";
import type { CampaignLaunchJob, MessageExecutionJob } from "@reachdem/shared";
import {
  emailWorkerConfig,
  getCampaignLaunchQueueName,
  getEmailQueueName,
  getSmsQueueName,
  getWhatsAppQueueName,
  scheduledWorkerConfig,
  smsWorkerConfig,
  whatsappWorkerConfig,
} from "./config";
import { requireScheduledWorkerEnv } from "./env";
import type { Env, ScheduledController } from "./types";

export async function handleScheduled(
  controller: ScheduledController,
  env: Env
): Promise<void> {
  requireScheduledWorkerEnv(env);
  const scheduledTime = new Date(controller.scheduledTime);

  console.log("[Cron] Triggered", {
    cron: controller.cron,
    scheduledTime: scheduledTime.toISOString(),
    environment: env.ENVIRONMENT,
  });

  switch (controller.cron) {
    case scheduledWorkerConfig.cron:
      await handleScheduledCampaigns(env, scheduledTime);
      await handleScheduledMessages(env, scheduledTime);
      await handleDeferredAuthEmails(env, scheduledTime);
      break;
    default:
      console.warn("[Cron] Unknown cron pattern", {
        cron: controller.cron,
      });
  }
}

async function handleScheduledCampaigns(
  env: Env,
  scheduledTime: Date
): Promise<void> {
  const payload = await CampaignService.claimScheduledCampaigns({
    until: scheduledTime,
    limit: scheduledWorkerConfig.campaignClaimBatchSize,
  });

  console.log("[Cron] Claimed scheduled campaigns", {
    updated: payload.updated,
    queue: getCampaignLaunchQueueName(env.ENVIRONMENT),
  });

  for (const campaign of payload.items) {
    const job: CampaignLaunchJob = {
      campaign_id: campaign.id,
      organization_id: campaign.organizationId,
    };

    console.log("[Cron] Publishing scheduled campaign", {
      campaignId: campaign.id,
      organizationId: campaign.organizationId,
      queue: getCampaignLaunchQueueName(env.ENVIRONMENT),
      scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
    });

    try {
      await env.CAMPAIGN_LAUNCH_QUEUE.send(job);
    } catch (error) {
      console.error("[Cron] Failed to publish scheduled campaign", {
        campaignId: campaign.id,
        organizationId: campaign.organizationId,
        queue: getCampaignLaunchQueueName(env.ENVIRONMENT),
        error: error instanceof Error ? error.message : String(error),
      });
      await CampaignService.revertScheduledCampaignClaim(campaign.id);
    }
  }
}

async function handleScheduledMessages(
  env: Env,
  scheduledTime: Date
): Promise<void> {
  const payload = await MessageService.claimScheduledMessages({
    until: scheduledTime,
    smsLimit: scheduledWorkerConfig.smsClaimBatchSize,
    emailLimit: scheduledWorkerConfig.emailClaimBatchSize,
    whatsappLimit: whatsappWorkerConfig.consumer.maxBatchSize,
  });

  console.log("[Cron] Claimed scheduled messages", {
    updated: payload.updated ?? payload.items.length,
    smsQueue: getSmsQueueName(env.ENVIRONMENT),
    emailQueue: getEmailQueueName(env.ENVIRONMENT),
    whatsappQueue: getWhatsAppQueueName(env.ENVIRONMENT),
  });

  for (const item of payload.items) {
    const job: MessageExecutionJob =
      item.channel === "sms"
        ? {
            message_id: item.id,
            organization_id: item.organizationId,
            channel: "sms",
            delivery_cycle: 1,
          }
        : item.channel === "whatsapp"
          ? {
              message_id: item.id,
              organization_id: item.organizationId,
              channel: "whatsapp",
              delivery_cycle: 1,
            }
          : {
              message_id: item.id,
              organization_id: item.organizationId,
              channel: "email",
              delivery_cycle: 1,
            };

    if (job.channel === "sms") {
      console.log("[Cron] Publishing scheduled SMS message", {
        messageId: job.message_id,
        queue: smsWorkerConfig.queueName,
        resolvedQueue: getSmsQueueName(env.ENVIRONMENT),
      });
      try {
        await env.SMS_QUEUE.send(job);
      } catch (error) {
        console.error("[Cron] Failed to publish scheduled SMS message", {
          messageId: job.message_id,
          queue: getSmsQueueName(env.ENVIRONMENT),
          error: error instanceof Error ? error.message : String(error),
        });
        await MessageService.revertScheduledMessageClaim(job.message_id);
      }
    } else if (job.channel === "email") {
      console.log("[Cron] Publishing scheduled email message", {
        messageId: job.message_id,
        queue: emailWorkerConfig.queueName,
        resolvedQueue: getEmailQueueName(env.ENVIRONMENT),
      });
      try {
        await env.EMAIL_QUEUE.send(job);
      } catch (error) {
        console.error("[Cron] Failed to publish scheduled email message", {
          messageId: job.message_id,
          queue: getEmailQueueName(env.ENVIRONMENT),
          error: error instanceof Error ? error.message : String(error),
        });
        await MessageService.revertScheduledMessageClaim(job.message_id);
      }
    } else {
      console.log("[Cron] Publishing scheduled WhatsApp message", {
        messageId: job.message_id,
        queue: whatsappWorkerConfig.queueName,
        resolvedQueue: getWhatsAppQueueName(env.ENVIRONMENT),
      });
      try {
        await env.WHATSAPP_QUEUE.send(job);
      } catch (error) {
        console.error("[Cron] Failed to publish scheduled WhatsApp message", {
          messageId: job.message_id,
          queue: getWhatsAppQueueName(env.ENVIRONMENT),
          error: error instanceof Error ? error.message : String(error),
        });
        await MessageService.revertScheduledMessageClaim(job.message_id);
      }
    }
  }

  console.log("[Cron] Queued scheduled messages", {
    count: payload.items.length,
  });
}

async function handleDeferredAuthEmails(
  env: Env,
  scheduledTime: Date
): Promise<void> {
  const endpoint = new URL(
    "/api/internal/auth/deferred-emails/process",
    env.API_BASE_URL
  );

  console.log("[Cron] Processing deferred auth emails", {
    endpoint: endpoint.toString(),
    scheduledTime: scheduledTime.toISOString(),
    limit: scheduledWorkerConfig.authDeferredEmailBatchSize,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": env.INTERNAL_API_SECRET,
    },
    body: JSON.stringify({
      until: scheduledTime.toISOString(),
      limit: scheduledWorkerConfig.authDeferredEmailBatchSize,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Deferred auth email processing failed (${response.status}): ${responseText}`
    );
  }

  const result = (await response.json()) as {
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
  };

  console.log("[Cron] Deferred auth emails processed", result);
}
