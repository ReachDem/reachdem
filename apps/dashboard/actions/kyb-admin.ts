"use server";

import { getDownloadPresignedUrl } from "@reachdem/core";
import { prisma } from "@reachdem/database";
import { OrganizationVerificationApprovedEmail } from "@reachdem/transactional/emails/organization-verification-approved";
import { OrganizationVerificationRejectedEmail } from "@reachdem/transactional/emails/organization-verification-rejected";
import { sendTransactionalEmail } from "@reachdem/transactional/mailer";
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
        name: true,
        workspaceVerificationStatus: true,
        idDocumentKey: true,
        businessDocumentKey: true,
        members: {
          where: { role: "owner" },
          take: 1,
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      return { error: "Organization not found" };
    }

    if (!organization.idDocumentKey || !organization.businessDocumentKey) {
      return { error: "Missing verification documents" };
    }

    const ownerEmail = organization.members[0]?.user.email;

    if (!ownerEmail) {
      return { error: "Organization owner email not found" };
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        workspaceVerificationStatus: "verified",
        workspaceVerifiedAt: new Date(),
      },
    });

    try {
      await sendTransactionalEmail({
        to: ownerEmail,
        subject: "Your organization has been verified",
        react: OrganizationVerificationApprovedEmail({
          organizationName: organization.name,
        }),
      });

      return { success: true };
    } catch (emailError) {
      console.error("Failed to send KYB approval email:", emailError);
      return {
        success: true,
        warning: "Verification approved, but the email could not be sent.",
      };
    }
  } catch (error) {
    console.error("Failed to approve KYB verification:", error);
    return { error: "Failed to approve verification" };
  }
}

export async function rejectKybVerification(
  organizationId: string,
  reason: string
) {
  try {
    await requireFounderSession();

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      return { error: "A rejection reason is required" };
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        members: {
          where: { role: "owner" },
          take: 1,
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      return { error: "Organization not found" };
    }

    const ownerEmail = organization.members[0]?.user.email;

    if (!ownerEmail) {
      return { error: "Organization owner email not found" };
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        workspaceVerificationStatus: "rejected",
        workspaceVerifiedAt: null,
      },
    });

    try {
      await sendTransactionalEmail({
        to: ownerEmail,
        subject: "Your organization verification needs updates",
        react: OrganizationVerificationRejectedEmail({
          organizationName: organization.name,
          reason: trimmedReason,
        }),
      });

      return { success: true };
    } catch (emailError) {
      console.error("Failed to send KYB rejection email:", emailError);
      return {
        success: true,
        warning: "Verification rejected, but the email could not be sent.",
      };
    }
  } catch (error) {
    console.error("Failed to reject KYB verification:", error);
    return { error: "Failed to reject verification" };
  }
}
