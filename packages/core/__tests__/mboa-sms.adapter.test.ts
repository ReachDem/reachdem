import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MboaSmsAdapter } from "../src/adapters/sms/mboa-sms.adapter";

describe("MboaSmsAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends an SMS using the documented MboaSMS payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        success: true,
        message: "SUCCESS",
        reference: "mboa-ref-1",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const adapter = new MboaSmsAdapter("user-id", "password");
    const result = await adapter.send({
      from: "infos",
      to: "+237677123456",
      text: "Hello from ReachDem",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];

    expect(String(url)).toBe("https://mboadeals.net/api/v1/sms/sendsms");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    expect(init?.body).toBe(
      JSON.stringify({
        user_id: "user-id",
        password: "password",
        message: "Hello from ReachDem",
        phone_str: "+237677123456",
        sender_name: "infos",
      })
    );
    expect(result).toMatchObject({
      success: true,
      providerMessageId: "mboa-ref-1",
    });
  });

  it("returns an error result when MboaSMS rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          message: "INVALID_CREDENTIALS",
        }),
      })
    );

    const adapter = new MboaSmsAdapter("user-id", "password");
    const result = await adapter.send({
      from: "infos",
      to: "+237677123456",
      text: "Hello from ReachDem",
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "mboasms_http_401",
      errorMessage: "INVALID_CREDENTIALS",
      retryable: true,
    });
  });
});
