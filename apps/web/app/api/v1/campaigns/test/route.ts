import { NextRequest, NextResponse } from "next/server";
import { auth } from "@reachdem/auth";
import { z } from "zod";
import { wrapContentInEmailStructure } from "@/lib/render-email";
import { EnqueueEmailUseCase } from "@reachdem/core";
import { publishEmailJob } from "@/lib/publish-email-job";
import { randomUUID } from "crypto";

const testEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  htmlContent: z.string().min(1, "Email content is required"),
  fontFamily: z.string().optional(),
  fontWeights: z.array(z.number()).optional(),
  fromName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "Workspace required" },
        { status: 403 }
      );
    }

    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const parsed = testEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Wrap content in email structure
    const fullHtml = wrapContentInEmailStructure(
      parsed.data.htmlContent,
      parsed.data.fontFamily || "Inter",
      parsed.data.fontWeights || [400, 600, 700]
    );

    // Use the same sender name as campaigns
    // Trim and check if fromName is not empty
    const customFromName = parsed.data.fromName?.trim();
    let fromName =
      customFromName && customFromName.length > 0
        ? customFromName
        : process.env.SENDER_NAME || "ReachDem";

    // Use the same email sending system as campaigns
    const result = await EnqueueEmailUseCase.execute(
      organizationId,
      {
        to: userEmail,
        subject: `[TEST] ${parsed.data.subject}`,
        html: fullHtml,
        from: fromName,
        idempotency_key: `test-${randomUUID()}`,
      },
      publishEmailJob
    );

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${userEmail}`,
      messageId: result.message_id,
      status: result.status,
      correlationId: result.correlation_id,
    });
  } catch (error) {
    console.error("[POST /api/v1/campaigns/test]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
