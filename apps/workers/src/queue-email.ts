import { ProcessEmailMessageJobUseCase } from "@reachdem/core";
import { emailWorkerConfig } from "./config";
import { requireEmailWorkerEnv } from "./env";
import { sendAlibabaDirectMail } from "./alibaba-direct-mail";
import type { Env, EmailMessage, MessageBatch } from "./types";

export async function handleEmailBatch(
  batch: MessageBatch<EmailMessage>,
  env: Env
): Promise<void> {
  requireEmailWorkerEnv(env);
  console.log("[Email Queue] Processing batch", {
    queue: batch.queue,
    size: batch.messages.length,
    environment: env.ENVIRONMENT,
    region: env.ALIBABA_REGION ?? "eu-central-1",
  });

  for (const message of batch.messages) {
    const job = message.body;

    try {
      console.log("[Email Queue] Starting message job", {
        messageId: job.message_id,
        organizationId: job.organization_id,
        deliveryCycle: job.delivery_cycle,
        maxDeliveryCycles: emailWorkerConfig.execution.maxDeliveryCycles,
      });

      const outcome = await ProcessEmailMessageJobUseCase.execute(job, {
        republish: async (nextJob) => {
          console.log("[Email Queue] Requeueing message job", {
            messageId: nextJob.message_id,
            deliveryCycle: nextJob.delivery_cycle,
          });
          await env.EMAIL_QUEUE.send(nextJob);
        },
        sendEmail: async ({ to, subject, html, from }) => {
          const startedAt = Date.now();
          console.log("[Email Queue] Sending Alibaba Direct Mail email", {
            messageId: job.message_id,
            to,
            fromName: from,
            provider: "alibaba-direct-mail",
            region: env.ALIBABA_REGION ?? "eu-central-1",
            subjectPreview: subject.slice(0, 80),
            htmlLength: html.length,
          });
          try {
            const result = await sendAlibabaDirectMail(
              {
                to,
                subject,
                html,
                fromName: from,
              },
              env
            );

            return {
              success: true,
              providerName: result.providerName,
              providerMessageId: result.providerMessageId ?? null,
              durationMs: Date.now() - startedAt,
            };
          } catch (error) {
            return {
              success: false,
              providerName: "alibaba-direct-mail",
              errorCode: "ALIBABA_DIRECT_MAIL_FAILED",
              errorMessage:
                error instanceof Error
                  ? error.message
                  : "Unknown Alibaba Direct Mail error",
              durationMs: Date.now() - startedAt,
            };
          }
        },
      });

      message.ack();
      console.log("[Email Queue] Completed message job", {
        messageId: job.message_id,
        organizationId: job.organization_id,
        outcome,
        acked: true,
      });
    } catch (error) {
      console.error("[Email Queue] Technical failure", {
        messageId: job.message_id,
        organizationId: job.organization_id,
        retrying: true,
        error: error instanceof Error ? error.message : String(error),
      });
      message.retry();
    }
  }
}
