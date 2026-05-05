"use server";

import { revalidatePath } from "next/cache";
import { prisma as db } from "@reachdem/database";
import { createSmtpTransport, getSmtpSenderEmail } from "@/lib/smtp";

// JSONContent from @tiptap/core — inline type to avoid direct dependency
type JSONContent = Record<string, unknown>;

export async function sendEmailBroadcast(formData: {
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
  fromName: string;
  sentBy: string;
}) {
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true },
    where: { emailVerified: true },
  });

  if (users.length === 0) {
    return { error: "No verified users found" };
  }

  const broadcast = await db.adminBroadcast.create({
    data: {
      subject: formData.subject,
      body: formData.bodyHtml,
      bodyJson: formData.bodyJson as object,
      channel: "EMAIL",
      status: "SENDING",
      sentBy: formData.sentBy,
      metadata: { fromName: formData.fromName },
      recipients: {
        create: users.map((u) => ({
          userId: u.id,
          email: u.email,
          status: "pending",
        })),
      },
    },
    include: { recipients: true },
  });

  const senderEmail = getSmtpSenderEmail();
  const transporter = createSmtpTransport();
  const errors: string[] = [];

  for (const recipient of broadcast.recipients) {
    if (!recipient.email) continue;
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

      await db.adminBroadcastRecipient.update({
        where: { id: recipient.id },
        data: { status: "sent", messageId: info.messageId ?? null },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${recipient.email}: ${msg}`);
      await db.adminBroadcastRecipient.update({
        where: { id: recipient.id },
        data: { status: "failed", errorMessage: msg },
      });
    }
  }

  const close = (transporter as { close?: () => void | Promise<void> }).close;
  if (typeof close === "function") await close.call(transporter);

  await db.adminBroadcast.update({
    where: { id: broadcast.id },
    data: {
      status: errors.length === broadcast.recipients.length ? "FAILED" : "SENT",
      sentAt: new Date(),
    },
  });

  revalidatePath("/broadcast");
  return {
    success: true,
    broadcastId: broadcast.id,
    sent: broadcast.recipients.length - errors.length,
    errors,
  };
}

export async function sendSmsBroadcast(formData: {
  body: string;
  channel: "SMS" | "WHATSAPP";
  sentBy: string;
}) {
  const users = await db.user.findMany({
    select: { id: true, email: true },
    where: { emailVerified: true },
  });

  const broadcast = await db.adminBroadcast.create({
    data: {
      body: formData.body,
      channel: formData.channel === "SMS" ? "SMS" : "WHATSAPP",
      status: "SENT",
      sentBy: formData.sentBy,
      sentAt: new Date(),
      recipients: {
        create: users.map((u) => ({
          userId: u.id,
          email: u.email,
          status: "sent",
        })),
      },
    },
  });

  revalidatePath("/broadcast");
  return { success: true, broadcastId: broadcast.id };
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
  const recipients = await db.adminBroadcastRecipient.findMany({
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
