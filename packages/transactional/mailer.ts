import type { ReactElement } from "react";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";

interface SendTransactionalEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

function getTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const smtpPort = Number.parseInt(process.env.SMTP_PORT || "465", 10);

  if (!smtpHost || !smtpUser || !smtpPass || Number.isNaN(smtpPort)) {
    throw new Error("SMTP environment variables are not configured correctly.");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    authMethod: "LOGIN",
  });
}

export async function sendTransactionalEmail({
  to,
  subject,
  react,
}: SendTransactionalEmailOptions) {
  const html = await render(react);
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `ReachDem <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}
