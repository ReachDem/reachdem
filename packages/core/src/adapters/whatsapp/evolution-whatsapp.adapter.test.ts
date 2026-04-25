import { afterEach, describe, expect, it, vi } from "vitest";

import { EvolutionWhatsAppAdapter } from "./evolution-whatsapp.adapter";

describe("EvolutionWhatsAppAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts phone number from ownerJid when fetchInstances has no number", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            instance: {
              instanceName: "prod-reachdem-org-f19dfc64",
              state: "open",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "e9e9308f-8e5d-4df6-8a4c-ad54af9e0b16",
              name: "prod-reachdem-org-f19dfc64",
              connectionStatus: "open",
              ownerJid: "237673498549@s.whatsapp.net",
              number: null,
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const adapter = new EvolutionWhatsAppAdapter(
      "https://wa-api.reachdem.cc",
      "test-api-key"
    );

    const result = await adapter.getConnectionState(
      "prod-reachdem-org-f19dfc64"
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      state: "open",
      phoneNumber: "+237673498549",
    });
  });
});
