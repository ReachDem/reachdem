import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { ActivityLogger } from "@reachdem/core";
import { internalCreateEventSchema } from "@reachdem/shared";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(req: NextRequest) {
  // Protect with shared secret — not a workspace auth cookie
  const secret = req.headers.get("x-internal-secret");
  const expected = Buffer.from(INTERNAL_SECRET || "");
  const actual = Buffer.from(secret || "");

  if (
    expected.length === 0 ||
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = internalCreateEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const event = await ActivityLogger.log(parsed.data);
    return NextResponse.json(
      { id: event.id, correlationId: event.correlationId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to ingest activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
