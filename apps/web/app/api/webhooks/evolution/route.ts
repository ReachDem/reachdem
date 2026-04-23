import { NextRequest, NextResponse } from "next/server";
import { EvolutionWebhookService } from "@reachdem/core";

function getBearerToken(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token.trim() : null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const isAuthorized = EvolutionWebhookService.isAuthorized({
    rawSecret: req.headers.get("x-webhook-secret"),
    headerSecret:
      req.headers.get("x-evolution-secret") ??
      req.headers.get("x-evolution-webhook-secret"),
    bearerToken: getBearerToken(req),
    queryToken:
      req.nextUrl.searchParams.get("token") ??
      req.nextUrl.searchParams.get("secret"),
  });

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = rawBody.length > 0 ? JSON.parse(rawBody) : null;
  } catch (error) {
    console.error("[POST /api/webhooks/evolution] Invalid JSON payload", error);
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  try {
    const outcome = await EvolutionWebhookService.process(payload);

    console.error("[POST /api/webhooks/evolution] outcome", outcome);
    if (!outcome.accepted) {
      console.error("[POST /api/webhooks/evolution] ignored payload", payload);
    }

    return NextResponse.json(outcome, {
      status: outcome.accepted ? 200 : 202,
    });
  } catch (error) {
    console.error("[POST /api/webhooks/evolution]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
