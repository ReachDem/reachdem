"use server";

import { getDownloadPresignedUrl } from "@reachdem/core";
import { prisma } from "@reachdem/database";
import { getServerSession } from "@/lib/founder-admin/auth";

async function requireFounderSession() {
  const session = await getServerSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function getKybDownloadUrls(
  idKey: string | null,
  bizKey: string | null
) {
  try {
    await requireFounderSession();

    const urls: { idUrl?: string; bizUrl?: string } = {};

    if (idKey) {
      urls.idUrl = await getDownloadPresignedUrl(idKey, 3600);
    }

    if (bizKey) {
      urls.bizUrl = await getDownloadPresignedUrl(bizKey, 3600);
    }

    return { urls };
  } catch (error) {
    console.error("Failed to generate presigned URLs:", error);
    return { error: "Failed to generate presigned URLs" };
  }
}

export async function approveKybVerification(organizationId: string) {
  try {
    await requireFounderSession();

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        workspaceVerificationStatus: true,
        idDocumentKey: true,
        businessDocumentKey: true,
      },
    });

    if (!organization) {
      return { error: "Organization not found" };
    }

    if (!organization.idDocumentKey || !organization.businessDocumentKey) {
      return { error: "Missing verification documents" };
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        workspaceVerificationStatus: "verified",
        workspaceVerifiedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to approve KYB verification:", error);
    return { error: "Failed to approve verification" };
  }
}

export async function rejectKybVerification(organizationId: string) {
  try {
    await requireFounderSession();

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      return { error: "Organization not found" };
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        workspaceVerificationStatus: "rejected",
        workspaceVerifiedAt: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to reject KYB verification:", error);
    return { error: "Failed to reject verification" };
  }
}
