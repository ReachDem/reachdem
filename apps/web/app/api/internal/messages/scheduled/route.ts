import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { MessageService } from "@reachdem/core";
import { z } from "zod";

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

const claimScheduledSchema = z.object({
  until: z.string().datetime(),
  smsLimit: z.number().int().positive(),
  emailLimit: z.number().int().positive(),
  whatsappLimit: z.number().int().positive().default(50),
});

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = claimScheduledSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const untilDate = new Date(parsed.data.until);
    if (Number.isNaN(untilDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid until value" },
        { status: 400 }
      );
    }

    const result = await MessageService.claimScheduledMessages({
      until: untilDate,
      smsLimit: parsed.data.smsLimit,
      emailLimit: parsed.data.emailLimit,
      whatsappLimit: parsed.data.whatsappLimit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /internal/messages/scheduled]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
