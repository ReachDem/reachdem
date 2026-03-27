import nodemailer from "nodemailer";
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
    smtpHost: env.SMTP_HOST,
    smtpPort: env.SMTP_PORT,
    senderEmail: env.SENDER_EMAIL,
  });

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT || "465", 10),
    secure: env.SMTP_SECURE === "true",
    authMethod: "LOGIN",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
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
            smtpHost: env.SMTP_HOST,
            subjectPreview: subject.slice(0, 80),
            htmlLength: html.length,
          });
          try {
            const info = await transporter.sendMail({
              from: `"${from}" <${env.SENDER_EMAIL}>`,
              to,
              subject,
              html,
            });

            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
              console.log("[Email Queue] Preview URL generated", {
                messageId: job.message_id,
                previewUrl,
              });
            }

            return {
              success: true,
              providerName: "smtp",
              providerMessageId: info.messageId,
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
