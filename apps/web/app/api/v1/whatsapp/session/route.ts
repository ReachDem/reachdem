import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import {
  ConnectWhatsAppSessionUseCase,
  EvolutionWhatsAppAdapter,
  OrganizationWhatsAppSessionService,
} from "@reachdem/core";
import { whatsappSessionConnectResponseSchema } from "@reachdem/shared";

export const GET = withWorkspace(async ({ organizationId }) => {
  try {
    let session =
      await OrganizationWhatsAppSessionService.getByOrganization(
        organizationId
      );

    const shouldSyncFromEvolution =
      session &&
      (session.status === "connecting" ||
        ((session.status === "connected" || session.status === "created") &&
          !session.phoneNumber));

    if (shouldSyncFromEvolution) {
      try {
        const adapter = new EvolutionWhatsAppAdapter();
        const connection = await adapter.getConnectionState(
          session.instanceName
        );
        const normalizedState = connection.state?.toLowerCase() ?? null;

        if (normalizedState === "open" || normalizedState === "connected") {
          session = await OrganizationWhatsAppSessionService.markConnected(
            organizationId,
            connection.phoneNumber ?? undefined
          );
        } else if (
          normalizedState === "close" ||
          normalizedState === "closed" ||
          normalizedState === "disconnected"
        ) {
          session = await OrganizationWhatsAppSessionService.markDisconnected(
            organizationId,
            connection.state ?? undefined
          );
        }
      } catch (error) {
        console.error("[GET /v1/whatsapp/session] sync failed", error);
      }
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("[GET /v1/whatsapp/session]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const POST = withWorkspace(async ({ organizationId }) => {
  try {
    const result = await ConnectWhatsAppSessionUseCase.execute(organizationId);
    return NextResponse.json(
      whatsappSessionConnectResponseSchema.parse(result),
      { status: 200 }
    );
  } catch (error: any) {
    if (
      error?.message === "WhatsApp channel is disabled" ||
      error?.message?.startsWith("Missing EVOLUTION_")
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error("[POST /v1/whatsapp/session]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
