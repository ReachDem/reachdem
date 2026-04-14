import { NextRequest, NextResponse } from "next/server";
import { auth } from "@reachdem/auth";
import { z } from "zod";
import { createSmtpTransport, getSmtpSenderEmail } from "@/lib/smtp";

const SUPPORT_TO = "latioms@gmail.com";
const SUPPORT_CC = "ronaldkamgaing4@gmail.com";

const supportRequestSchema = z.object({
  email: z.string().trim().email("A valid email is required"),
  subject: z.string().trim().min(1, "Subject is required").max(160),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMessageHtml(message: string) {
  return escapeHtml(message).replace(/\r?\n/g, "<br />");
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = supportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const transporter = createSmtpTransport();
    const senderEmail = getSmtpSenderEmail();
    const senderName = process.env.SENDER_NAME?.trim() || "ReachDem Support";

    try {
      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: SUPPORT_TO,
        cc: SUPPORT_CC,
        replyTo: parsed.data.email,
        subject: `[Help Center] ${parsed.data.subject}`,
        text: [
          "New help center request",
          `From: ${parsed.data.email}`,
          `Subject: ${parsed.data.subject}`,
          "",
          parsed.data.message,
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin: 0 0 16px;">New help center request</h2>
            <p style="margin: 0 0 8px;"><strong>From:</strong> ${escapeHtml(parsed.data.email)}</p>
            <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${escapeHtml(parsed.data.subject)}</p>
            <div style="margin-top: 24px;">
              <p style="margin: 0 0 8px;"><strong>Message:</strong></p>
              <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
                ${formatMessageHtml(parsed.data.message)}
              </div>
            </div>
          </div>
        `,
      });

      return NextResponse.json({
        success: true,
        messageId: info.messageId,
      });
    } finally {
      const close = (transporter as { close?: () => void | Promise<void> })
        .close;
      if (typeof close === "function") {
        await close.call(transporter);
      }
    }
  } catch (error) {
    console.error("[POST /api/support/request]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
