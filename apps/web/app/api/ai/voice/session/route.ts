import { NextResponse } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@reachdem/auth/guards";
import { createElevenLabsSession } from "@/lib/ai/voice";

const voiceSessionSchema = z.object({
  agentId: z.string().min(1).optional(),
});

export const POST = withWorkspace(async ({ req, userId, organizationId }) => {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = voiceSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await createElevenLabsSession({
      userId,
      organizationId,
      agentId: parsed.data.agentId,
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("[POST /api/ai/voice/session]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});
