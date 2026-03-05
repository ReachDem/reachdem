import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hashValue,
  maskEndpoint,
  redactMeta,
  truncate,
} from "../src/utils/pii-scrubber";
import {
  listActivitySchema,
  internalCreateEventSchema,
} from "@reachdem/shared";

// ─── PII Scrubber Tests ───────────────────────────────────────────────────────

describe("pii-scrubber", () => {
  describe("hashValue", () => {
    it("returns a 16-char hex string", () => {
      const result = hashValue("+33612345678");
      expect(result).toHaveLength(16);
      expect(result).toMatch(/^[a-f0-9]+$/);
    });

    it("is deterministic for the same input", () => {
      expect(hashValue("test@example.com")).toBe(hashValue("test@example.com"));
    });

    it("produces different hashes for different inputs", () => {
      expect(hashValue("+33600000001")).not.toBe(hashValue("+33600000002"));
    });
  });

  describe("maskEndpoint", () => {
    it("masks Twilio-style account IDs in URLs", () => {
      const raw =
        "/2010-04-01/Accounts/AC1234567890abcdef1234567890abcdef/Messages";
      const masked = maskEndpoint(raw);
      expect(masked).not.toContain("AC1234567890abcdef1234567890abcdef");
      expect(masked).toContain("/***/");
    });

    it("does not alter a clean path", () => {
      const clean = "/v1/messages";
      expect(maskEndpoint(clean)).toBe(clean);
    });
  });

  describe("redactMeta", () => {
    it("redacts known PII field names", () => {
      const payload = {
        to: "+33612345678",
        from: "+33600000000",
        body: "You have an appointment tomorrow",
        sid: "SM123",
        status: "queued",
      };
      const redacted = redactMeta(payload);
      expect(redacted["to"]).toContain("[REDACTED");
      expect(redacted["from"]).toContain("[REDACTED");
      expect(redacted["body"]).toContain("[REDACTED");
      // Safe fields should pass through
      expect(redacted["sid"]).toBe("SM123");
      expect(redacted["status"]).toBe("queued");
    });

    it("handles nested objects recursively", () => {
      const payload = { nested: { email: "user@example.com", count: 5 } };
      const redacted = redactMeta(payload) as any;
      expect(redacted.nested.email).toContain("[REDACTED");
      expect(redacted.nested.count).toBe(5);
    });

    it("redacts arrays with count metadata", () => {
      const payload = { recipients: ["a@b.com", "c@d.com"] };
      const redacted = redactMeta(payload) as any;
      expect(redacted.recipients).toBe("[REDACTED_ARRAY:count=2]");
    });
  });

  describe("truncate", () => {
    it("returns the string unchanged if within limit", () => {
      expect(truncate("hello", 500)).toBe("hello");
    });

    it("truncates at the given max length", () => {
      const long = "a".repeat(600);
      const result = truncate(long, 500);
      expect(result.length).toBeLessThanOrEqual(502); // 500 + ellipsis char
      expect(result.endsWith("…")).toBe(true);
    });
  });
});

// ─── Zod Schema Tests ─────────────────────────────────────────────────────────

describe("listActivitySchema", () => {
  it("accepts valid query params with defaults", () => {
    const result = listActivitySchema.safeParse({ limit: "20" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(20);
  });

  it("rejects invalid category", () => {
    const result = listActivitySchema.safeParse({ category: "blockchain" });
    expect(result.success).toBe(false);
  });

  it("caps limit to max 100", () => {
    const result = listActivitySchema.safeParse({ limit: "999" });
    expect(result.success).toBe(false);
  });
});

describe("internalCreateEventSchema", () => {
  it("accepts a valid event payload", () => {
    const result = internalCreateEventSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440000",
      category: "sms",
      action: "send_attempt",
      status: "pending",
      provider: "twilio",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = internalCreateEventSchema.safeParse({ category: "sms" });
    expect(result.success).toBe(false);
  });

  it("auto-accepts optional correlationId", () => {
    const result = internalCreateEventSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440000",
      category: "email",
      action: "send_success",
      status: "success",
    });
    expect(result.success).toBe(true);
  });
});
