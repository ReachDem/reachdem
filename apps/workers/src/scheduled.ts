import nodemailer from "nodemailer";
import type { Env } from "./types";

// In-memory execution counter (persists during worker process lifetime)
let executionCount = 0;
const MAX_EXECUTIONS = 2;

// Handle scheduled cron triggers.
// Configured cron schedule in wrangler.jsonc:
//   - every 2 minutes, stops after 2 executions
export async function handleScheduled(
  controller: ScheduledController,
  env: Env
): Promise<void> {
  const cronPattern = controller.cron;
  const scheduledTime = new Date(controller.scheduledTime);

  console.log(
    `[Cron] Triggered: "${cronPattern}" at ${scheduledTime.toISOString()}`
  );

  if (executionCount >= MAX_EXECUTIONS) {
    console.log(`[Cron] ⏹ Already sent ${MAX_EXECUTIONS} messages. Skipping.`);
    return;
  }

  switch (cronPattern) {
    case "*/2 * * * *":
      await handleScheduledEmail(env, scheduledTime);
      break;
    default:
      console.warn(`[Cron] Unknown cron pattern: ${cronPattern}`);
  }
}

/**
 * Every 2 minutes: send a test/report email via nodemailer.
 */
async function handleScheduledEmail(
  env: Env,
  scheduledTime: Date
): Promise<void> {
  executionCount++;
  console.log(
    `[Cron] Execution ${executionCount}/${MAX_EXECUTIONS} — Sending scheduled emails...`
  );

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

  const time = scheduledTime.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const recipients = ["latioms@gmail.com", "reachdemltd@gmail.com"];

  for (const [i, to] of recipients.entries()) {
    await transporter.sendMail({
      from: `"${env.SENDER_NAME}" <${env.SENDER_EMAIL}>`,
      to,
      subject: `Message scheduled and sent at time ${time}`,
      html: `
        <h2>⏰ Message scheduled and sent at time ${time}</h2>
        <p><strong>Recipient:</strong> ${to}</p>
        <p><strong>Execution:</strong> ${executionCount}/${MAX_EXECUTIONS}</p>
        <p><strong>Environment:</strong> ${env.ENVIRONMENT}</p>
        <hr/>
        <p>This is an automated scheduled email from the Cloudflare Worker cron trigger.</p>
      `,
    });

    console.log(`[Cron] ✓ Email ${i + 1} sent to ${to}`);
  }

  console.log(`[Cron] ✓ Execution ${executionCount}/${MAX_EXECUTIONS} done`);
  if (executionCount >= MAX_EXECUTIONS) {
    console.log(
      "[Cron] ⏹ Max executions reached. No more emails will be sent."
    );
  }
}
