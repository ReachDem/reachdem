import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvlytextAdapter } from "../src/adapters/sms/avlytext.adapter";

describe("AvlytextAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a single SMS using the documented POST endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        id: "avlytext-message-id",
        cost: 0.025,
        parts: 1,
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const adapter = new AvlytextAdapter("test-api-key");
    const result = await adapter.send({
      from: "ReachDem",
      to: "+237699224477",
      text: "Hello from ReachDem",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];

    expect(String(url)).toBe(
      "https://api.avlytext.com/v1/sms?api_key=test-api-key"
    );
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    expect(init?.body).toBe(
      JSON.stringify({
        sender: "ReachDem",
        recipient: "+237699224477",
        text: "Hello from ReachDem",
      })
    );
    expect(result).toMatchObject({
      success: true,
      providerMessageId: "avlytext-message-id",
    });
  });

  it("returns a provider error when AvlyText rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: vi.fn().mockResolvedValue({
          message: "The recipient field is required.",
        }),
      })
    );

    const adapter = new AvlytextAdapter("test-api-key");
    const result = await adapter.send({
      from: "ReachDem",
      to: "+237699224477",
      text: "Hello from ReachDem",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "avlytext_http_422",
      errorMessage: "The recipient field is required.",
      retryable: true,
    });
  });
});
