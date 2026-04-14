import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@reachdem/database";
import { z } from "zod";
import { createSmtpTransport, getSmtpSenderEmail } from "@/lib/smtp";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const DEFAULT_BATCH_LIMIT = 50;

const processDeferredAuthEmailsSchema = z.object({
  until: z.string().datetime(),
  limit: z.number().int().positive().max(200).optional(),
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 1000);
  }

  return String(error).slice(0, 1000);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = processDeferredAuthEmailsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const untilDate = new Date(parsed.data.until);
    if (Number.isNaN(untilDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid until value" },
        { status: 400 }
      );
    }

    const limit = parsed.data.limit ?? DEFAULT_BATCH_LIMIT;
    const candidates = await prisma.authDeferredEmail.findMany({
      where: {
        scheduledAt: {
          lte: untilDate,
        },
        sentAt: null,
        claimedAt: null,
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: limit,
      select: {
        id: true,
        toEmail: true,
        subject: true,
        html: true,
        fromName: true,
        replyTo: true,
        scheduledAt: true,
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    }

    const transporter = createSmtpTransport();
    const senderEmail = getSmtpSenderEmail();

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    try {
      for (const candidate of candidates) {
        const claim = await prisma.authDeferredEmail.updateMany({
          where: {
            id: candidate.id,
            sentAt: null,
            claimedAt: null,
          },
          data: {
            claimedAt: new Date(),
          },
        });

        if (claim.count === 0) {
          skipped += 1;
          continue;
        }

        processed += 1;

        try {
          const info = await transporter.sendMail({
            from: `"${candidate.fromName}" <${senderEmail}>`,
            to: candidate.toEmail,
            subject: candidate.subject,
            html: candidate.html,
            replyTo: candidate.replyTo || undefined,
          });

          await prisma.authDeferredEmail.update({
            where: { id: candidate.id },
            data: {
              sentAt: new Date(),
              attemptCount: {
                increment: 1,
              },
              lastError: null,
            },
          });

          sent += 1;

          console.log("[POST /internal/auth/deferred-emails/process] Sent", {
            id: candidate.id,
            toEmail: candidate.toEmail,
            scheduledAt: candidate.scheduledAt.toISOString(),
            providerMessageId: info.messageId,
          });
        } catch (error) {
          failed += 1;

          await prisma.authDeferredEmail.update({
            where: { id: candidate.id },
            data: {
              claimedAt: null,
              attemptCount: {
                increment: 1,
              },
              lastError: getErrorMessage(error),
            },
          });

          console.error(
            "[POST /internal/auth/deferred-emails/process] Failed",
            {
              id: candidate.id,
              toEmail: candidate.toEmail,
              error: getErrorMessage(error),
            }
          );
        }
      }
    } finally {
      const close = (transporter as { close?: () => void | Promise<void> })
        .close;
      if (typeof close === "function") {
        await close.call(transporter);
      }
    }

    return NextResponse.json({
      processed,
      sent,
      failed,
      skipped,
    });
  } catch (error) {
    console.error("[POST /internal/auth/deferred-emails/process]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
