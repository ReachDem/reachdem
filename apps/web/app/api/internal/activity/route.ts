import { NextRequest, NextResponse } from "next/server";
import { ActivityLogger } from "@reachdem/core";
import { internalCreateEventSchema } from "@reachdem/shared";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(req: NextRequest) {
  // Protect with shared secret — not a workspace auth cookie
  const secret = req.headers.get("x-internal-secret");
  if (!INTERNAL_SECRET || !secret || secret !== INTERNAL_SECRET) {
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
