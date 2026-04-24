import { NextResponse } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@reachdem/auth/guards";
import { runAIChat } from "@/lib/ai/orchestrator";

const chatRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  providerOverride: z.enum(["gemini", "openai"]).optional(),
  page: z
    .object({
      pageType: z.string().optional(),
      resourceType: z.string().optional(),
      resourceId: z.string().optional(),
    })
    .optional(),
  requestedAction: z
    .object({
      capability: z.string(),
      summary: z.string(),
      targetLabel: z.string().optional(),
      input: z.unknown().optional(),
    })
    .optional(),
});

export const POST = withWorkspace(async ({ req, userId, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const response = await runAIChat({
      userId,
      organizationId,
      body: parsed.data,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[POST /api/ai/chat]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});
