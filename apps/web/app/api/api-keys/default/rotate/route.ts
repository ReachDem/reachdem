import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { rotateDefaultApiKeyForOrganization } from "@reachdem/auth/api-key";

export const dynamic = "force-dynamic";

export const POST = withWorkspace(async ({ organizationId, userId }) => {
  try {
    const apiKey = await rotateDefaultApiKeyForOrganization({
      organizationId,
      revokedBy: userId,
    });

    return NextResponse.json({
      apiKey: apiKey.token,
      redacted: apiKey.redacted,
      title: apiKey.title,
      type: apiKey.type,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
    });
  } catch (error) {
    console.error("[POST /api/api-keys/default/rotate]", error);
    return NextResponse.json(
      { error: "Unable to rotate the workspace API key." },
      { status: 500 }
    );
  }
});
