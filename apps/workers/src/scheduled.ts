import {
  CampaignService,
  MessageService,
  ProcessWebhookDeliveriesUseCase,
} from "@reachdem/core";
import { createHmac } from "crypto";
import type { CampaignLaunchJob, MessageExecutionJob } from "@reachdem/shared";
import {
  emailWorkerConfig,
  getCampaignLaunchQueueName,
  getEmailQueueName,
  getSmsQueueName,
  scheduledWorkerConfig,
  smsWorkerConfig,
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
      await handleWebhookDeliveries(env, scheduledTime);
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
  });

  console.log("[Cron] Claimed scheduled messages", {
    updated: payload.updated ?? payload.items.length,
    smsQueue: getSmsQueueName(env.ENVIRONMENT),
    emailQueue: getEmailQueueName(env.ENVIRONMENT),
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
    } else {
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
    }
  }

  console.log("[Cron] Queued scheduled messages", {
    count: payload.items.length,
  });
}

async function handleWebhookDeliveries(
  env: Env,
  scheduledTime: Date
): Promise<void> {
  const summary = await ProcessWebhookDeliveriesUseCase.execute({
    limit: scheduledWorkerConfig.webhookDeliveryBatchSize,
    now: scheduledTime,
    send: async (delivery) => {
      const payloadJson = JSON.stringify(delivery.payload);
      const signature = delivery.signingSecret
        ? createHmac("sha256", delivery.signingSecret)
            .update(payloadJson)
            .digest("hex")
        : null;
      const response = await fetch(delivery.targetUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-reachdem-event-type": delivery.eventType,
          "x-reachdem-organization-id": delivery.organizationId,
          "x-reachdem-attempt": String(delivery.attemptCount),
          ...(delivery.apiKeyId
            ? { "x-reachdem-api-key-id": delivery.apiKeyId }
            : {}),
          ...(signature ? { "x-reachdem-signature": signature } : {}),
        },
        body: payloadJson,
      });

      return {
        statusCode: response.status,
        error: response.ok ? null : await response.text(),
      };
    },
  });

  console.log("[Cron] Processed webhook deliveries", {
    claimed: summary.claimed,
    delivered: summary.delivered,
    failed: summary.failed,
  });
}
