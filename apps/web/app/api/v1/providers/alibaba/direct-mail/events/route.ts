import { NextRequest, NextResponse } from "next/server";
import { EmailDeliverabilityService } from "@reachdem/core";

function isAuthorized(request: NextRequest): boolean {
  const expectedToken = process.env.ALIBABA_EVENTBRIDGE_TOKEN?.trim();
  if (!expectedToken) {
    return true;
  }

  const headerToken =
    request.headers.get("x-eventbridge-signature-token")?.trim() ||
    request.headers.get("x-reachdem-webhook-secret")?.trim();
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();

  return headerToken === expectedToken || queryToken === expectedToken;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const result =
      await EmailDeliverabilityService.ingestAlibabaEvents(payload);

    return NextResponse.json({
      ok: true,
      provider: "alibaba-direct-mail",
      ...result,
    });
  } catch (error) {
    console.error("[Alibaba Direct Mail Events] Error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
