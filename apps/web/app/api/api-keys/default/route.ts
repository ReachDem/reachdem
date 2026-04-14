import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { ensureDefaultApiKeyForOrganization } from "@reachdem/auth/api-key";
import { prisma } from "@reachdem/database";

export const dynamic = "force-dynamic";

export const GET = withWorkspace(async ({ organizationId, userId }) => {
  try {
    const apiKey = await ensureDefaultApiKeyForOrganization({
      organizationId,
      createdBy: userId,
    });

    const activeKeyCount = await prisma.apiKey.count({
      where: {
        organizationId,
        revokedAt: null,
        deletedAt: null,
      },
    });

    return NextResponse.json({
      apiKey: apiKey.token,
      redacted: apiKey.redacted,
      title: apiKey.title,
      type: apiKey.type,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      activeKeyCount,
    });
  } catch (error) {
    console.error("[GET /api/api-keys/default]", error);
    return NextResponse.json(
      { error: "Unable to load the workspace API key." },
      { status: 500 }
    );
  }
});
