"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@reachdem/database";
import { getDocumentPresignedUrl } from "@/lib/r2";

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

// ─── Reject verification ──────────────────────────────────────────────────────

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
