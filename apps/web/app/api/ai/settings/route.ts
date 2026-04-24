import { NextResponse } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@reachdem/auth/guards";
import { getAISettings, updateAISettings } from "@/lib/ai/settings";

const settingsUpdateSchema = z.object({
  preferredProvider: z.enum(["gemini", "openai"]).optional(),
  openaiApiKey: z.string().min(1).nullable().optional(),
  voiceEnabled: z.boolean().optional(),
  elevenlabsAgentId: z.string().min(1).nullable().optional(),
});

export const GET = withWorkspace(async ({ userId, organizationId }) => {
  try {
    const settings = await getAISettings(userId, organizationId);
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("[GET /api/ai/settings]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});

export const PUT = withWorkspace(async ({ req, userId, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = settingsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const settings = await updateAISettings(
      userId,
      organizationId,
      parsed.data
    );
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("[PUT /api/ai/settings]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});
