import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { MessageService } from "@reachdem/core";
import { z } from "zod";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

const updateStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: z.enum(["scheduled", "queued", "sending", "sent", "failed"]),
});

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-internal-secret");
  const expected = Buffer.from(INTERNAL_SECRET || "");
  const actual = Buffer.from(secret || "");

  return !(
    expected.length === 0 ||
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  );
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await MessageService.updateMessageStatuses(
      parsed.data.ids,
      parsed.data.status
    );

    return NextResponse.json({
      updated: result.count,
      ids: result.ids,
    });
  } catch (error) {
    console.error("[PATCH /internal/messages/status]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
