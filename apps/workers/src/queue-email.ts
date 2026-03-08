import nodemailer from "nodemailer";
import type { Env, EmailMessage } from "./types";

/**
 * Process a batch of email messages from the queue.
 * Sends concurrently with Promise.allSettled, 2sec delay between each.
 */
export async function handleEmailBatch(
  batch: MessageBatch<EmailMessage>,
  env: Env
): Promise<void> {
  const count = batch.messages.length;
  console.log(`[Email Queue] Processing batch of ${count} messages`);

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT || "465"),
    secure: env.SMTP_SECURE === "true",
    authMethod: "LOGIN",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  // Process all messages concurrently
  const results = await Promise.allSettled(
    batch.messages.map(async (message, index) => {
      // Stagger sends by 2sec per message to avoid SMTP throttling
      await delay(index * 2000);

      const email = message.body;
      console.log(`[Email ${index + 1}/${count}] Sending to ${email.to}`);

      const info = await transporter.sendMail({
        from: `"${env.SENDER_NAME}" <${env.SENDER_EMAIL}>`,
        to: email.to,
        subject: email.subject,
        html: email.html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl)
        console.log(`[Email ${index + 1}/${count}] Preview: ${previewUrl}`);

      message.ack();
      console.log(`[Email ${index + 1}/${count}] ✓ Sent to ${email.to}`);
      return email.to;
    })
  );

  // Handle failures
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const to = batch.messages[i].body.to;
      console.error(`[Email] ✗ Failed ${to}:`, result.reason);
      batch.messages[i].retry();
    }
  }

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`[Email Queue] Batch done: ${succeeded} sent, ${failed} failed`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
