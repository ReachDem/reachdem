import { ProcessSmsMessageJobUseCase } from "@reachdem/core";
import type { Env, MessageBatch, SmsMessage } from "./types";

export async function handleSmsBatch(
  batch: MessageBatch<SmsMessage>,
  env: Env
): Promise<void> {
  console.log(
    `[SMS Queue] Processing batch of ${batch.messages.length} messages`
  );

  for (const message of batch.messages) {
    try {
      const job = message.body;
      console.log(
        `[SMS Queue] Processing message ${job.message_id} cycle ${job.delivery_cycle}`
      );

      const outcome = await ProcessSmsMessageJobUseCase.execute(job, {
        republish: async (nextJob) => {
          await env.SMS_QUEUE.send(nextJob);
        },
      });

      message.ack();
      console.log(
        `[SMS Queue] Completed message ${job.message_id} with outcome ${outcome}`
      );
    } catch (error) {
      console.error(
        `[SMS Queue] Failed to process message ${message.body.message_id}:`,
        error
      );
      message.retry();
    }
  }
}
