import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { MessageService } from "@reachdem/core";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const until = url.searchParams.get("until");

  if (!until) {
    return NextResponse.json(
      { error: "Missing required query parameter: until" },
      { status: 400 }
    );
  }

  const untilDate = new Date(until);
  if (Number.isNaN(untilDate.getTime())) {
    return NextResponse.json({ error: "Invalid until value" }, { status: 400 });
  }

  try {
    const items = await MessageService.listScheduledMessages(untilDate);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /internal/messages/scheduled]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
