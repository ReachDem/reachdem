import { ProcessEmailMessageJobUseCase } from "@reachdem/core";
import { emailWorkerConfig } from "./config";
import { requireEmailWorkerEnv } from "./env";
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
    apiBaseUrl: env.API_BASE_URL,
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
          console.log("[Email Queue] Sending SMTP email", {
            messageId: job.message_id,
            to,
            fromName: from,
            apiBaseUrl: env.API_BASE_URL,
            subjectPreview: subject.slice(0, 80),
            htmlLength: html.length,
          });
          try {
            const response = await fetch(
              `${env.API_BASE_URL}/api/internal/messages/email-send`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-internal-secret": env.INTERNAL_API_SECRET,
                },
                body: JSON.stringify({
                  to,
                  subject,
                  html,
                  fromName: from,
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text().catch(() => "");
              throw new Error(
                `Email send API failed (HTTP ${response.status})${errorText ? `: ${errorText}` : ""}`
              );
            }

            const result = (await response.json()) as {
              providerName?: string;
              providerMessageId?: string | null;
            };

            return {
              success: true,
              providerName: result.providerName ?? "smtp",
              providerMessageId: result.providerMessageId ?? null,
              durationMs: Date.now() - startedAt,
            };
          } catch (error) {
            return {
              success: false,
              providerName: "smtp",
              errorCode: "SMTP_SEND_FAILED",
              errorMessage:
                error instanceof Error ? error.message : "Unknown SMTP error",
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
