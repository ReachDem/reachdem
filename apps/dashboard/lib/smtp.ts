import nodemailer from "nodemailer";

export function getSmtpSenderEmail() {
  const email =
    process.env.SMTP_USER ||
    process.env.SENDER_EMAIL ||
    process.env.ALIBABA_SENDER_EMAIL;
  if (!email?.trim()) throw new Error("SMTP sender email is not configured");
  return email.trim();
}

export function createSmtpTransport() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    throw new Error("SMTP environment is not configured");
  }
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
