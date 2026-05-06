"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma as db } from "@reachdem/database";
import { createSmtpTransport, getSmtpSenderEmail } from "@/lib/smtp";

// JSONContent from @tiptap/core — inline type to avoid direct dependency
type JSONContent = Record<string, unknown>;
type BroadcastUserRecipient = { id: string; email: string | null };
type BroadcastEmailRecipient = { id: string; email: string };
type BroadcastStatsRecipient = {
  status: string;
  deliveredAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  bouncedAt: Date | null;
};

const EMAIL_SEND_CONCURRENCY = 5;
const DEFAULT_MAX_SYNC_EMAIL_RECIPIENTS = 100;

function getMaxSyncEmailRecipients() {
  const configured = Number(process.env.ADMIN_EMAIL_BROADCAST_SYNC_LIMIT);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_SYNC_EMAIL_RECIPIENTS;
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<TResult>
): Promise<TResult[]> {
  const results: TResult[] = [];

  for (let index = 0; index < items.length; index += concurrency) {
    const chunk = items.slice(index, index + concurrency);
    results.push(...(await Promise.all(chunk.map(mapper))));
  }

  return results;
}

export async function sendEmailBroadcast(formData: {
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
  fromName: string;
  sentBy: string;
}) {
  const maxRecipients = getMaxSyncEmailRecipients();
  const users: BroadcastUserRecipient[] = await db.user.findMany({
    select: { id: true, email: true },
    where: { emailVerified: true },
    orderBy: { createdAt: "asc" },
    take: maxRecipients + 1,
  });

  if (users.length === 0) {
    return { error: "No verified users found" };
  }

  if (users.length > maxRecipients) {
    return {
      error: `Email broadcast has ${users.length}+ verified recipients. The admin SMTP action is capped at ${maxRecipients} recipients to avoid request timeouts; use the campaign worker flow for larger sends.`,
    };
  }

  const broadcast = await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const created = await tx.adminBroadcast.create({
        data: {
          subject: formData.subject,
          body: formData.bodyHtml,
          bodyJson: formData.bodyJson as object,
          channel: "EMAIL",
          status: "SENDING",
          sentBy: formData.sentBy,
          metadata: {
            fromName: formData.fromName,
            recipientCount: users.length,
          },
        },
      });

      await tx.adminBroadcastRecipient.createMany({
        data: users.map((user) => ({
          broadcastId: created.id,
          userId: user.id,
          email: user.email,
          status: "pending",
        })),
      });

      return created;
    }
  );

  const recipientRows: BroadcastUserRecipient[] =
    await db.adminBroadcastRecipient.findMany({
      where: { broadcastId: broadcast.id, email: { not: null } },
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    });
  const recipients: BroadcastEmailRecipient[] = recipientRows.flatMap(
    (recipient) =>
      recipient.email ? [{ id: recipient.id, email: recipient.email }] : []
  );
  const senderEmail = getSmtpSenderEmail();
  const transporter = createSmtpTransport();

  const results = await mapWithConcurrency(
    recipients,
    EMAIL_SEND_CONCURRENCY,
    async (recipient) => {
      try {
        const info = await transporter.sendMail({
          from: `"${formData.fromName}" <${senderEmail}>`,
          to: recipient.email,
          subject: formData.subject,
          html: formData.bodyHtml,
          headers: {
            "X-Broadcast-Id": broadcast.id,
            "X-Recipient-Id": recipient.id,
          },
        });

        return {
          recipientId: recipient.id,
          email: recipient.email,
          ok: true as const,
          messageId: info.messageId ?? null,
        };
      } catch (err) {
        return {
          recipientId: recipient.id,
          email: recipient.email,
          ok: false as const,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }
  );

  try {
    const close = (transporter as { close?: () => void | Promise<void> }).close;
    if (typeof close === "function") await close.call(transporter);
  } catch {
    // Nothing useful to recover here; delivery results above are authoritative.
  }

  const sent = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);
  const errors = failed.map((result) => `${result.email}: ${result.error}`);

  if (sent.length > 0) {
    await db.adminBroadcastRecipient.updateMany({
      where: { id: { in: sent.map((result) => result.recipientId) } },
      data: { status: "sent" },
    });
  }

  if (failed.length > 0) {
    await db.adminBroadcastRecipient.updateMany({
      where: { id: { in: failed.map((result) => result.recipientId) } },
      data: {
        status: "failed",
        errorMessage: "SMTP delivery failed; see broadcast metadata.",
      },
    });
  }

  await db.adminBroadcast.update({
    where: { id: broadcast.id },
    data: {
      status: sent.length === 0 ? "FAILED" : "SENT",
      sentAt: new Date(),
      metadata: {
        fromName: formData.fromName,
        fromEmail: senderEmail,
        recipientCount: recipients.length,
        sentCount: sent.length,
        failedCount: failed.length,
        errors: errors.slice(0, 50),
      },
    },
  });

  revalidatePath("/broadcast");
  return {
    success: true,
    broadcastId: broadcast.id,
    sent: sent.length,
    errors,
  };
}

export async function sendSmsBroadcast(formData: {
  body: string;
  channel: "SMS" | "WHATSAPP";
  sentBy: string;
}) {
  void formData;
  return {
    error:
      "SMS and WhatsApp admin broadcasts are not connected to a provider yet. Use the campaign worker flow, or wire this action to the SMS/WhatsApp workers before enabling it.",
  };
}

export async function getBroadcasts() {
  return db.adminBroadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { recipients: true } },
    },
  });
}

export async function getBroadcastStats(broadcastId: string) {
  const recipients: BroadcastStatsRecipient[] =
    await db.adminBroadcastRecipient.findMany({
      where: { broadcastId },
      select: {
        status: true,
        deliveredAt: true,
        openedAt: true,
        clickedAt: true,
        bouncedAt: true,
      },
    });

  const total = recipients.length;
  const sent = recipients.filter((r) =>
    ["sent", "delivered", "opened", "clicked"].includes(r.status)
  ).length;
  const delivered = recipients.filter(
    (r) => r.deliveredAt || r.status === "delivered"
  ).length;
  const opened = recipients.filter(
    (r) => r.openedAt || r.status === "opened"
  ).length;
  const clicked = recipients.filter(
    (r) => r.clickedAt || r.status === "clicked"
  ).length;
  const bounced = recipients.filter(
    (r) => r.bouncedAt || r.status === "bounced"
  ).length;

  return {
    total,
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
    openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
    clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
    bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
  };
}
