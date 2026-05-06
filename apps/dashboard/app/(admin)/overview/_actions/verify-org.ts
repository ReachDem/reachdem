"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@reachdem/database";
import { getDocumentPresignedUrl } from "@/lib/r2";
import { createSmtpTransport, getSmtpSenderEmail } from "@/lib/smtp";

// ─── Get a short-lived signed URL for a KYB document ─────────────────────────

export async function getDocumentUrl(
  orgId: string,
  docType: "id" | "business"
): Promise<{ url?: string; error?: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { idDocumentKey: true, businessDocumentKey: true },
  });

  if (!org) return { error: "Organisation introuvable" };

  const key = docType === "id" ? org.idDocumentKey : org.businessDocumentKey;
  if (!key) return { error: "Document non disponible" };

  try {
    const url = await getDocumentPresignedUrl(key, 300); // 5 min
    return { url };
  } catch {
    return { error: "Impossible de générer le lien du document" };
  }
}

// ─── Approve verification ─────────────────────────────────────────────────────

export async function approveOrg(
  orgId: string,
  senderId: string
): Promise<{ success?: boolean; error?: string }> {
  if (!senderId.trim())
    return { error: "Le Sender ID est requis pour l'approbation" };

  const existing = await prisma.organization.findFirst({
    where: { senderId: senderId.trim(), id: { not: orgId } },
    select: { id: true },
  });
  if (existing)
    return {
      error: "Ce Sender ID est déjà utilisé par une autre organisation",
    };

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      workspaceVerificationStatus: "verified",
      workspaceVerifiedAt: new Date(),
      senderId: senderId.trim(),
    },
  });

  revalidatePath("/overview");
  return { success: true };
}

export async function rejectOrg(
  orgId: string
): Promise<{ success?: boolean; error?: string }> {
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      workspaceVerificationStatus: "rejected",
      workspaceVerifiedAt: null,
    },
  });

  revalidatePath("/overview");
  return { success: true };
}

export async function sendVerificationNudge(
  orgId: string,
  message: string
): Promise<{ success?: boolean; error?: string }> {
  if (!message.trim()) return { error: "Le message est requis" };

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      companyName: true,
      members: {
        where: { role: "owner" },
        select: { user: { select: { email: true, name: true } } },
        take: 1,
      },
    },
  });

  if (!org) return { error: "Organisation introuvable" };

  const owner = org.members[0]?.user;
  if (!owner?.email)
    return { error: "Aucun propriétaire trouvé pour cette organisation" };

  try {
    const transport = createSmtpTransport();
    await transport.sendMail({
      from: `ReachDem <${getSmtpSenderEmail()}>`,
      to: owner.email,
      subject: "Action requise : vérifiez votre organisation sur ReachDem",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <p>Bonjour ${owner.name ?? ""},</p>
          <p>${message.replace(/\n/g, "<br>")}</p>
          <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
            &mdash; L'équipe ReachDem
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch {
    return { error: "Échec de l'envoi du message" };
  }
}
