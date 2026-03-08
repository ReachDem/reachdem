import type { Env, SmsMessage } from "./types";

/**
 * Process a batch of SMS messages from the queue.
 */
export async function handleSmsBatch(
  batch: MessageBatch<SmsMessage>,
  env: Env
): Promise<void> {
  console.log(
    `[SMS Queue] Processing batch of ${batch.messages.length} messages`
  );

  for (const message of batch.messages) {
    try {
      const sms = message.body;
      console.log(`[SMS] Sending to ${sms.to} for contact ${sms.contactId}`);

      // TODO: Integrate with actual SMS provider (Twilio, etc.)
      // For now, simulate processing
      await simulateSmsSend(sms);

      // Acknowledge the message (remove from queue)
      message.ack();
      console.log(`[SMS] Successfully sent to ${sms.to}`);
    } catch (error) {
      console.error(`[SMS] Failed to send to ${message.body.to}:`, error);
      // Retry the message (will go to DLQ after max_retries)
      message.retry();
    }
  }
}

async function simulateSmsSend(sms: SmsMessage): Promise<void> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(
    `[SMS Sim] Message delivered to ${sms.to}: "${sms.body.substring(0, 50)}..."`
  );
}
