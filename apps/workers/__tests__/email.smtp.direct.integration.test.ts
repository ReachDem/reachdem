import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ?? "465";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_SECURE = process.env.SMTP_SECURE ?? "true";
const SENDER_EMAIL = process.env.SMTP_USER;
const SENDER_NAME = process.env.ALIBABA_SENDER_NAME ?? "ReachDem Notifications";
const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO;

describe("Direct email SMTP integration", () => {
  if (
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASSWORD ||
    !SENDER_EMAIL ||
    !TEST_EMAIL_TO
  ) {
    it("skips when SMTP or target email env vars are missing", () => {
      const missing = [
        !SMTP_HOST && "SMTP_HOST",
        !SMTP_USER && "SMTP_USER",
        !SMTP_PASSWORD && "SMTP_PASSWORD",
        !SENDER_EMAIL && "SENDER_EMAIL",
        !TEST_EMAIL_TO && "TEST_EMAIL_TO",
      ].filter(Boolean);

      console.log(`[Direct Email] Missing env vars: ${missing.join(", ")}`);
      expect(missing.length).toBeGreaterThan(0);
    });
    return;
  }

  it("sends a real email directly with nodemailer", async () => {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: SMTP_SECURE === "true",
      authMethod: "LOGIN",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    const subject = `ReachDem direct email test ${new Date().toISOString()}`;
    const html = `
        <h2>ReachDem direct email test</h2>
        <p>This email was sent directly with nodemailer.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `;

    console.log(
      `[Direct Email] starting to=${TEST_EMAIL_TO} sender=${SENDER_NAME} <${SENDER_EMAIL}>`
    );
    console.log(`[Direct Email] subject="${subject}"`);

    const startedAt = Date.now();
    const info = await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: TEST_EMAIL_TO,
      subject,
      html,
    });
    const durationMs = Date.now() - startedAt;
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log(
      `[Direct Email] success=true messageId=${info.messageId} durationMs=${durationMs}`
    );
    console.log(
      `[Direct Email] accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)}`
    );
    if (previewUrl) {
      console.log(`[Direct Email] preview=${previewUrl}`);
    }

    expect(info.accepted).toContain(TEST_EMAIL_TO);
    expect(info.rejected).toHaveLength(0);
  }, 45_000);
});
