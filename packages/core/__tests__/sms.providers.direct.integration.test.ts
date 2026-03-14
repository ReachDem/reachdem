import { describe, expect, it } from "vitest";
import { AvlytextAdapter } from "../src/adapters/sms/avlytext.adapter";
import { MboaSmsAdapter } from "../src/adapters/sms/mboa-sms.adapter";
import type {
  SmsPayload,
  SmsResult,
  SmsSender,
} from "../src/ports/sms-sender.port";

type ProviderCase = {
  label: string;
  sender: SmsSender;
  payload: SmsPayload;
};

const MBOA_SMS_USERID =
  process.env.MBOA_SMS_USERID ?? process.env.NEXT_PUBLIC_MBOA_SMS_USERID;
const MBOA_SMS_API_PASSWORD =
  process.env.MBOA_SMS_API_PASSWORD ??
  process.env.NEXT_PUBLIC_MBOA_SMS_API_PASSWORD;
const AVLYTEXT_API_KEY = process.env.AVLYTEXT_API_KEY;

const TEST_MBOA_SMS_PHONE = process.env.TEST_MBOA_SMS_PHONE;
const TEST_AVLYTEXT_SMS_PHONE = process.env.TEST_AVLYTEXT_SMS_PHONE;
const TEST_MBOA_SMS_SENDER = process.env.TEST_MBOA_SMS_SENDER ?? "infos";
const TEST_AVLYTEXT_SMS_SENDER =
  process.env.TEST_AVLYTEXT_SMS_SENDER ?? "ReachDem";

function redactPhone(phone: string): string {
  const normalized = phone.replace(/\s+/g, "");
  if (normalized.length <= 6) return normalized;
  return `${normalized.slice(0, 6)}***${normalized.slice(-3)}`;
}

function logResult(testCase: ProviderCase, result: SmsResult): void {
  const baseLog =
    `[Direct SMS][${testCase.label}]` +
    ` provider=${testCase.sender.providerName}` +
    ` to=${redactPhone(testCase.payload.to)}` +
    ` sender=${testCase.payload.from}`;

  if (result.success) {
    console.log(
      `${baseLog} success=true providerMessageId=${result.providerMessageId} durationMs=${result.durationMs}`
    );
    return;
  }

  console.log(
    `${baseLog} success=false errorCode=${result.errorCode} retryable=${result.retryable} durationMs=${result.durationMs} errorMessage=${result.errorMessage}`
  );
}

const providerCases: ProviderCase[] = [];

if (MBOA_SMS_USERID && MBOA_SMS_API_PASSWORD && TEST_MBOA_SMS_PHONE) {
  providerCases.push({
    label: "MboaSMS direct",
    sender: new MboaSmsAdapter(MBOA_SMS_USERID, MBOA_SMS_API_PASSWORD),
    payload: {
      to: TEST_MBOA_SMS_PHONE,
      from: TEST_MBOA_SMS_SENDER,
      text: "ReachDem test MboaSMS",
    },
  });
}

if (AVLYTEXT_API_KEY && TEST_AVLYTEXT_SMS_PHONE) {
  providerCases.push({
    label: "AvlyText direct",
    sender: new AvlytextAdapter(AVLYTEXT_API_KEY),
    payload: {
      to: TEST_AVLYTEXT_SMS_PHONE,
      from: TEST_AVLYTEXT_SMS_SENDER,
      text: "ReachDem test AvlyText",
    },
  });
}

describe("Direct SMS provider integration", () => {
  if (providerCases.length === 0) {
    it("skips when direct provider env vars are missing", () => {
      console.log(
        "[Direct SMS] Set TEST_MBOA_SMS_PHONE and/or TEST_AVLYTEXT_SMS_PHONE with provider credentials to run real sends."
      );
      expect(providerCases).toHaveLength(0);
    });
    return;
  }

  for (const testCase of providerCases) {
    it(`sends directly with ${testCase.sender.providerName}`, async () => {
      console.log(
        `[Direct SMS][${testCase.label}] starting provider=${testCase.sender.providerName} to=${redactPhone(testCase.payload.to)} sender=${testCase.payload.from}`
      );
      console.log(
        `[Direct SMS][${testCase.label}] text="${testCase.payload.text}"`
      );

      const result = await testCase.sender.send(testCase.payload);
      logResult(testCase, result);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.success).toBe(true);
    }, 45_000);
  }
});
