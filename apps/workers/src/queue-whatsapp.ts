import { ProcessWhatsAppMessageJobUseCase } from "@reachdem/core";
import { whatsappWorkerConfig } from "./config";
import { requireWhatsAppWorkerEnv } from "./env";
import type { Env, MessageBatch, WhatsAppMessage } from "./types";

export async function handleWhatsAppBatch(
  batch: MessageBatch<WhatsAppMessage>,
  env: Env
): Promise<void> {
  requireWhatsAppWorkerEnv(env);

  for (const message of batch.messages) {
    const job = message.body;

    try {
      const outcome = await ProcessWhatsAppMessageJobUseCase.execute(job, {
        republish: async (nextJob) => {
          await env.WHATSAPP_QUEUE.send(nextJob);
        },
      });

      message.ack();
      console.log("[WhatsApp Queue] Completed message job", {
        messageId: job.message_id,
        organizationId: job.organization_id,
        outcome,
        acked: true,
        maxDeliveryCycles: whatsappWorkerConfig.execution.maxDeliveryCycles,
      });
    } catch (error) {
      console.error("[WhatsApp Queue] Technical failure", {
        messageId: job.message_id,
        organizationId: job.organization_id,
        retrying: true,
        error: error instanceof Error ? error.message : String(error),
      });
      message.retry();
    }
  }
}
