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
  console.log(
    `[Email Queue] Processing batch of ${batch.messages.length} messages from ${batch.queue} in ${env.ENVIRONMENT}`
  );

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
      console.log(
        `[Email Queue] Starting message ${job.message_id} cycle ${job.delivery_cycle}/${emailWorkerConfig.execution.maxDeliveryCycles}`
      );

      const outcome = await ProcessEmailMessageJobUseCase.execute(job, {
        republish: async (nextJob) => {
          console.log(
            `[Email Queue] Requeueing message ${nextJob.message_id} for delivery cycle ${nextJob.delivery_cycle}`
          );
          await env.EMAIL_QUEUE.send(nextJob);
        },
        sendEmail: async ({ to, subject, html, from }) => {
          const startedAt = Date.now();
          console.log(
            `[Email Queue] Sending SMTP email for message ${job.message_id} to ${to}`
          );
          try {
            const info = await transporter.sendMail({
              from: `"${from}" <${env.SENDER_EMAIL}>`,
              to,
              subject,
              html,
            });

            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
              console.log(`[Email Queue] Preview: ${previewUrl}`);
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
      console.log(
        `[Email Queue] Completed message ${job.message_id} with outcome ${outcome}; acked successfully`
      );
    } catch (error) {
      console.error(
        `[Email Queue] Technical failure for message ${job.message_id}; scheduling queue retry`,
        error
      );
      message.retry();
    }
  }
}
