import { sendAlibabaDirectMail } from "../apps/workers/src/alibaba-direct-mail";
import type { Env } from "../apps/workers/src/types";

function getArg(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);

  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0) return process.argv[index + 1];

  return undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const to =
    getArg("to") ?? process.env.TEST_USER_EMAIL ?? "reachdemltd@gmail.com";
  const fromName = getArg("fromName") ?? "Direct API";
  const subject =
    getArg("subject") ?? `[DIRECT API] ${fromName} ${new Date().toISOString()}`;
  const html =
    getArg("html") ??
    `<p>Direct Alibaba API test.</p><p>Requested alias: <strong>${fromName}</strong></p><p>Sent at: ${new Date().toISOString()}</p>`;

  const env: Env = {
    CAMPAIGN_LAUNCH_QUEUE: { send: async () => {} },
    SMS_QUEUE: { send: async () => {} },
    EMAIL_QUEUE: { send: async () => {} },
    DATABASE_URL: process.env.DATABASE_URL,
    PRISMA_ACCELERATE_URL: process.env.PRISMA_ACCELERATE_URL,
    ENVIRONMENT: process.env.ENVIRONMENT ?? "script",
    API_BASE_URL: process.env.API_BASE_URL ?? "http://localhost:3000",
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET ?? "script",
    ALIBABA_ACCESS_KEY_ID: requireEnv("ALIBABA_ACCESS_KEY_ID"),
    ALIBABA_ACCESS_KEY_SECRET: requireEnv("ALIBABA_ACCESS_KEY_SECRET"),
    ALIBABA_REGION: process.env.ALIBABA_REGION ?? "eu-central-1",
    ALIBABA_SENDER_EMAIL:
      process.env.ALIBABA_SENDER_EMAIL ?? process.env.SENDER_EMAIL,
    ALIBABA_SENDER_NAME:
      process.env.ALIBABA_SENDER_NAME ?? process.env.SENDER_NAME,
    LMT_API_KEY: process.env.LMT_API_KEY,
    LMT_SECRET: process.env.LMT_SECRET,
    AVLYTEXT_API_KEY: process.env.AVLYTEXT_API_KEY,
    MBOA_SMS_USERID: process.env.MBOA_SMS_USERID,
    MBOA_SMS_API_PASSWORD: process.env.MBOA_SMS_API_PASSWORD,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    INFOBIP_API_KEY: process.env.INFOBIP_API_KEY,
    INFOBIP_BASE_URL: process.env.INFOBIP_BASE_URL,
    SMTP_HOST: process.env.SMTP_HOST ?? "",
    SMTP_PORT: process.env.SMTP_PORT ?? "",
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? "",
    SMTP_SECURE: process.env.SMTP_SECURE ?? "true",
    SENDER_EMAIL:
      process.env.SENDER_EMAIL ??
      process.env.ALIBABA_SENDER_EMAIL ??
      requireEnv("ALIBABA_SENDER_EMAIL"),
    SENDER_NAME:
      process.env.SENDER_NAME ?? process.env.ALIBABA_SENDER_NAME ?? "ReachDem",
  };

  console.log("[Direct Alibaba API Test] Sending", {
    to,
    fromName,
    subject,
    region: env.ALIBABA_REGION,
    senderEmail: env.ALIBABA_SENDER_EMAIL,
    envSenderName: env.ALIBABA_SENDER_NAME,
  });

  const result = await sendAlibabaDirectMail(
    {
      to,
      subject,
      html,
      fromName,
    },
    env
  );

  console.log("[Direct Alibaba API Test] Result", result);
}

main().catch((error) => {
  console.error(
    "[Direct Alibaba API Test] Failed",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
