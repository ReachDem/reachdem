"use server";

import { auth } from "@reachdem/auth";
import { getUploadPresignedUrl } from "@reachdem/core";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import {
  ALLOWED_KYB_DOC_TYPES,
  ALLOWED_KYB_IMAGE_TYPES,
} from "@/lib/server/kyb";
import { notifyAdminsOfValidationRequest } from "@/lib/server/admin-notify";

export async function generateKybUploadUrl(
  docType: "id" | "business",
  contentType: string,
  extension: string
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userWithState = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  const organizationId =
    session.session.activeOrganizationId ??
    userWithState?.defaultOrganizationId ??
    null;

  if (!organizationId) {
    return { error: "No organization found" };
  }

  // Validate types based on doc category
  if (docType === "id" && !ALLOWED_KYB_IMAGE_TYPES.includes(contentType)) {
    return { error: "ID Document must be an image (JPG, PNG, WebP)" };
  }
  if (docType === "business" && !ALLOWED_KYB_DOC_TYPES.includes(contentType)) {
    return { error: "Business Document must be PDF, JPG, PNG, or WebP" };
  }

  const key = `kyb/${organizationId}/${docType}-${nanoid(12)}.${extension}`;

  try {
    const url = await getUploadPresignedUrl(key, contentType, 600); // 10 minutes
    return { success: true, url, key };
  } catch (error) {
    console.error("Failed to generate upload URL:", error);
    return { error: "Failed to initialize upload" };
  }
}

export async function submitKybVerification(data: {
  websiteUrl: string;
  idDocumentKey: string;
  businessDocumentKey: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userWithState = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  const organizationId =
    session.session.activeOrganizationId ??
    userWithState?.defaultOrganizationId ??
    null;

  if (!organizationId) {
    return { error: "No organization found" };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { workspaceVerificationStatus: true },
  });

  if (!org) {
    return { error: "Organization not found" };
  }

  if (
    org.workspaceVerificationStatus === "pending" ||
    org.workspaceVerificationStatus === "verified"
  ) {
    return {
      error: "You cannot resubmit while your status is pending or verified.",
    };
  }

  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        websiteUrl: data.websiteUrl,
        idDocumentKey: data.idDocumentKey,
        businessDocumentKey: data.businessDocumentKey,
        workspaceVerificationStatus: "pending",
      },
    });

    // Notify admins
    notifyAdminsOfValidationRequest(
      "Organization",
      `Organization ID: ${organizationId}\nUser ID: ${session.user.id}\nWebsite URL: ${data.websiteUrl}`
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to submit KYB verification:", error);
    return { error: "Failed to submit verification" };
  }
}
