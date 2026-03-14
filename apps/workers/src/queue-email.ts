import nodemailer from "nodemailer";
import { ProcessEmailMessageJobUseCase } from "@reachdem/core";
import type { Env, EmailMessage, MessageBatch } from "./types";

export async function handleEmailBatch(
  batch: MessageBatch<EmailMessage>,
  env: Env
): Promise<void> {
  console.log(
    `[Email Queue] Processing batch of ${batch.messages.length} messages`
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
    try {
      const job = message.body;
      console.log(
        `[Email Queue] Processing message ${job.message_id} cycle ${job.delivery_cycle}`
      );

      const outcome = await ProcessEmailMessageJobUseCase.execute(job, {
        republish: async (nextJob) => {
          await env.EMAIL_QUEUE.send(nextJob);
        },
        sendEmail: async ({ to, subject, html, from }) => {
          const startedAt = Date.now();
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
        `[Email Queue] Completed message ${job.message_id} with outcome ${outcome}`
      );
    } catch (error) {
      console.error(
        `[Email Queue] Failed to process message ${message.body.message_id}:`,
        error
      );
      message.ack();
    }
  }
}
