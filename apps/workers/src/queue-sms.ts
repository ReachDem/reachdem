import { ProcessSmsMessageJobUseCase } from "@reachdem/core";
import { smsWorkerConfig } from "./config";
import { requireSmsWorkerEnv } from "./env";
import type { Env, MessageBatch, SmsMessage } from "./types";

export async function handleSmsBatch(
  batch: MessageBatch<SmsMessage>,
  env: Env
): Promise<void> {
  requireSmsWorkerEnv(env);
  console.log(
    `[SMS Queue] Processing batch of ${batch.messages.length} messages from ${batch.queue} in ${env.ENVIRONMENT}`
  );

  for (const message of batch.messages) {
    const job = message.body;

    try {
      console.log(
        `[SMS Queue] Starting message ${job.message_id} cycle ${job.delivery_cycle}/${smsWorkerConfig.execution.maxDeliveryCycles}`
      );

      const outcome = await ProcessSmsMessageJobUseCase.execute(job, {
        republish: async (nextJob) => {
          console.log(
            `[SMS Queue] Requeueing message ${nextJob.message_id} for delivery cycle ${nextJob.delivery_cycle}`
          );
          await env.SMS_QUEUE.send(nextJob);
        },
      });

      message.ack();
      console.log(
        `[SMS Queue] Completed message ${job.message_id} with outcome ${outcome}; acked successfully`
      );
    } catch (error) {
      console.error(
        `[SMS Queue] Technical failure for message ${job.message_id}; scheduling queue retry`,
        error
      );
      message.retry();
    }
  }
}
