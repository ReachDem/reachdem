import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { createSmtpTransport, getSmtpSenderEmail } from "@/lib/smtp";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

const emailSendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  fromName: z.string().min(1),
});

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-internal-secret");
  const expected = Buffer.from(INTERNAL_SECRET || "");
  const actual = Buffer.from(secret || "");

  return !(
    expected.length === 0 ||
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  );
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = emailSendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const transporter = createSmtpTransport();
    const senderEmail = getSmtpSenderEmail();

    try {
      const info = await transporter.sendMail({
        from: `"${parsed.data.fromName}" <${senderEmail}>`,
        to: parsed.data.to,
        subject: parsed.data.subject,
        html: parsed.data.html,
      });

      return NextResponse.json({
        providerName: "smtp",
        providerMessageId: info.messageId,
      });
    } finally {
      const close = (transporter as { close?: () => void | Promise<void> })
        .close;
      if (typeof close === "function") {
        await close.call(transporter);
      }
    }
  } catch (error) {
    console.error("[POST /internal/messages/email-send]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
