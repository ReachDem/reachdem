import nodemailer from "nodemailer";

export function createSmtpTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export function getSmtpSenderEmail(): string {
  return process.env.SMTP_USER ?? "noreply@mail.rcdm.ink";
}
