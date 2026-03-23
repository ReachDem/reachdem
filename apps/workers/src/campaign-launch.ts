import { ProcessCampaignLaunchJobUseCase } from "@reachdem/core";
import {
  campaignWorkerConfig,
  emailWorkerConfig,
  smsWorkerConfig,
} from "./config";
import { requireCampaignWorkerEnv } from "./env";
import type { CampaignLaunchMessage, Env, MessageBatch } from "./types";

export async function handleCampaignLaunchBatch(
  batch: MessageBatch<CampaignLaunchMessage>,
  env: Env
): Promise<void> {
  requireCampaignWorkerEnv(env);
  console.log(
    `[Campaign Launch Queue] Processing batch of ${batch.messages.length} jobs from ${batch.queue} in ${env.ENVIRONMENT}`
  );

  for (const message of batch.messages) {
    const job = message.body;

    try {
      console.log(
        `[Campaign Launch Queue] Starting campaign ${job.campaign_id} for organization ${job.organization_id}`
      );

      const outcome = await ProcessCampaignLaunchJobUseCase.execute(
        job,
        async (smsJob) => {
          console.log(
            `[Campaign Launch Queue] Publishing SMS message ${smsJob.message_id} to ${smsWorkerConfig.queueName}`
          );
          await env.SMS_QUEUE.send(smsJob);
        },
        async (emailJob) => {
          console.log(
            `[Campaign Launch Queue] Publishing email message ${emailJob.message_id} to ${emailWorkerConfig.queueName}`
          );
          await env.EMAIL_QUEUE.send(emailJob);
        }
      );

      message.ack();
      console.log(
        `[Campaign Launch Queue] Completed campaign ${job.campaign_id} with outcome ${outcome}; acked successfully`
      );
    } catch (error) {
      console.error(
        `[Campaign Launch Queue] Technical failure for campaign ${job.campaign_id}; scheduling queue retry`,
        error
      );
      message.retry();
    }
  }
}
