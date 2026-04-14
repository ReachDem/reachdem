import { ProcessSmsMessageJobUseCase } from "@reachdem/core";
import { smsWorkerConfig } from "./config";
import { requireSmsWorkerEnv } from "./env";
import type { Env, MessageBatch, SmsMessage } from "./types";

export async function handleSmsBatch(
  batch: MessageBatch<SmsMessage>,
  env: Env
): Promise<void> {
  requireSmsWorkerEnv(env);
  console.log("[SMS Queue] Processing batch", {
    queue: batch.queue,
    size: batch.messages.length,
    environment: env.ENVIRONMENT,
  });

  for (const message of batch.messages) {
    const job = message.body;

    try {
      console.log("[SMS Queue] Starting message job", {
        messageId: job.message_id,
        organizationId: job.organization_id,
        deliveryCycle: job.delivery_cycle,
        maxDeliveryCycles: smsWorkerConfig.execution.maxDeliveryCycles,
      });

      const outcome = await ProcessSmsMessageJobUseCase.execute(job, {
        republish: async (nextJob) => {
          console.log("[SMS Queue] Requeueing message job", {
            messageId: nextJob.message_id,
            deliveryCycle: nextJob.delivery_cycle,
          });
          await env.SMS_QUEUE.send(nextJob);
        },
      });

      message.ack();
      console.log("[SMS Queue] Completed message job", {
        messageId: job.message_id,
        organizationId: job.organization_id,
        outcome,
        acked: true,
      });
    } catch (error) {
      console.error("[SMS Queue] Technical failure", {
        messageId: job.message_id,
        organizationId: job.organization_id,
        retrying: true,
        error: error instanceof Error ? error.message : String(error),
      });
      message.retry();
    }
  }
}
