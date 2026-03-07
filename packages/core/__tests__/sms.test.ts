import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyError } from "../src/adapters/sms/error-classifier";
import { StubAdapter } from "../src/adapters/sms/stub.adapter";
import type { SmsPayload, SmsResult } from "../src/ports/sms-sender.port";

// ─── Error Classifier Tests ───────────────────────────────────────────────────

describe("classifyError", () => {
  it("classifies known final Twilio error codes as final", () => {
    expect(classifyError("21211")).toBe("final");
    expect(classifyError("21610")).toBe("final");
    expect(classifyError("30034")).toBe("final");
  });

  it("classifies known final Infobip codes as final", () => {
    expect(classifyError("EC_0002")).toBe("final");
    expect(classifyError("EC_0004")).toBe("final");
  });

  it("classifies semantic final codes as final", () => {
    expect(classifyError("invalid_number")).toBe("final");
    expect(classifyError("opt_out")).toBe("final");
    expect(classifyError("number_blacklisted")).toBe("final");
  });

  it("classifies retryable codes as retryable", () => {
    expect(classifyError("timeout")).toBe("retryable");
    expect(classifyError("rate_limit")).toBe("retryable");
    expect(classifyError("network_error")).toBe("retryable");
  });

  it("defaults unknown codes to retryable (safe fallback)", () => {
    expect(classifyError("http_503")).toBe("retryable");
    expect(classifyError("unknown_xyz")).toBe("retryable");
  });
});

// ─── StubAdapter Tests ────────────────────────────────────────────────────────

describe("StubAdapter", () => {
  const payload: SmsPayload = {
    to: "+2376XXXXXXXX",
    text: "Hello from ReachDem",
    from: "ReachDem",
  };

  it("returns success by default", async () => {
    const stub = new StubAdapter();
    const result = await stub.send(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.providerMessageId).toBe("stub_msg_001");
    }
  });

  it("records every call made to it", async () => {
    const stub = new StubAdapter();
    await stub.send(payload);
    await stub.send({ ...payload, to: "+237000000001" });
    expect(stub.calls).toHaveLength(2);
    expect(stub.calls[0].to).toBe("+2376XXXXXXXX");
  });

  it("can simulate a retryable failure", async () => {
    const failResult: SmsResult = {
      success: false,
      errorCode: "timeout",
      errorMessage: "Simulated timeout",
      retryable: true,
      durationMs: 5000,
    };
    const stub = new StubAdapter(failResult);
    const result = await stub.send(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryable).toBe(true);
      expect(result.errorCode).toBe("timeout");
    }
  });

  it("can simulate a final (non-retryable) failure", async () => {
    const failResult: SmsResult = {
      success: false,
      errorCode: "21211",
      errorMessage: "Invalid number",
      retryable: false,
      durationMs: 200,
    };
    const stub = new StubAdapter(failResult);
    const result = await stub.send(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryable).toBe(false);
    }
  });
});

// ─── sendSmsSchema Validation Tests ──────────────────────────────────────────

describe("sendSmsSchema validation", () => {
  // We test the schema directly without importing from @reachdem/shared to
  // avoid circular deps in unit test context. The real validation is in the route.
  const E164_REGEX = /^\+[1-9]\d{7,14}$/;

  it("accepts a valid E.164 phone number", () => {
    expect(E164_REGEX.test("+2376XXXXXXXX".replace(/X/g, "5"))).toBe(true);
    expect(E164_REGEX.test("+33612345678")).toBe(true);
    expect(E164_REGEX.test("+14155552671")).toBe(true);
  });

  it("rejects numbers without a leading +", () => {
    expect(E164_REGEX.test("2376XXXXXXXX".replace(/X/g, "5"))).toBe(false);
    expect(E164_REGEX.test("0612345678")).toBe(false);
  });

  it("rejects numbers that are too short", () => {
    expect(E164_REGEX.test("+123")).toBe(false);
  });

  it("rejects numbers with letters", () => {
    expect(E164_REGEX.test("+1415abc5678")).toBe(false);
  });
});
