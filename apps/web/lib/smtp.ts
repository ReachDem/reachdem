import nodemailer from "nodemailer";

function getConfiguredSenderEmail() {
  const senderEmail =
    process.env.SENDER_EMAIL ||
    process.env.ALIBABA_SENDER_EMAIL ||
    process.env.SMTP_USER;

  return senderEmail?.trim() || "";
}

export function getSmtpSenderEmail() {
  const senderEmail = getConfiguredSenderEmail();

  if (!senderEmail) {
    throw new Error("SMTP sender email is not configured");
  }

  return senderEmail;
}

export function assertSmtpConfiguration() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    throw new Error("SMTP environment is not configured");
  }

  getSmtpSenderEmail();
}

export function createSmtpTransport() {
  assertSmtpConfiguration();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: process.env.SMTP_SECURE !== "false",
    authMethod: "LOGIN",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}
