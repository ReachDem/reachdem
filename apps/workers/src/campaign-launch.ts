import { ProcessCampaignLaunchJobUseCase } from "@reachdem/core";
import {
  campaignWorkerConfig,
  emailWorkerConfig,
  getEmailQueueName,
  getSmsQueueName,
  getWhatsAppQueueName,
  smsWorkerConfig,
  whatsappWorkerConfig,
} from "./config";
import { requireCampaignWorkerEnv } from "./env";
import type { CampaignLaunchMessage, Env, MessageBatch } from "./types";

export async function handleCampaignLaunchBatch(
  batch: MessageBatch<CampaignLaunchMessage>,
  env: Env
): Promise<void> {
  requireCampaignWorkerEnv(env);
  console.log("[Campaign Launch Queue] Processing batch", {
    queue: batch.queue,
    size: batch.messages.length,
    environment: env.ENVIRONMENT,
    smsQueue: getSmsQueueName(env.ENVIRONMENT),
    emailQueue: getEmailQueueName(env.ENVIRONMENT),
    whatsappQueue: getWhatsAppQueueName(env.ENVIRONMENT),
  });

  for (const message of batch.messages) {
    const job = message.body;

    try {
      console.log("[Campaign Launch Queue] Starting campaign job", {
        campaignId: job.campaign_id,
        organizationId: job.organization_id,
      });

      const outcome = await ProcessCampaignLaunchJobUseCase.execute(
        job,
        async (smsJob) => {
          console.log("[Campaign Launch Queue] Publishing SMS child job", {
            campaignId: job.campaign_id,
            messageId: smsJob.message_id,
            queue: getSmsQueueName(env.ENVIRONMENT),
          });
          await env.SMS_QUEUE.send(smsJob);
        },
        async (emailJob) => {
          console.log("[Campaign Launch Queue] Publishing email child job", {
            campaignId: job.campaign_id,
            messageId: emailJob.message_id,
            queue: getEmailQueueName(env.ENVIRONMENT),
          });
          await env.EMAIL_QUEUE.send(emailJob);
        },
        async (whatsAppJob) => {
          console.log("[Campaign Launch Queue] Publishing WhatsApp child job", {
            campaignId: job.campaign_id,
            messageId: whatsAppJob.message_id,
            queue: getWhatsAppQueueName(env.ENVIRONMENT),
          });
          await env.WHATSAPP_QUEUE.send(whatsAppJob);
        }
      );

      message.ack();
      console.log("[Campaign Launch Queue] Completed campaign job", {
        campaignId: job.campaign_id,
        organizationId: job.organization_id,
        outcome,
        acked: true,
      });
    } catch (error) {
      console.error("[Campaign Launch Queue] Technical failure", {
        campaignId: job.campaign_id,
        organizationId: job.organization_id,
        retrying: true,
        error: error instanceof Error ? error.message : String(error),
      });
      message.retry();
    }
  }
}
