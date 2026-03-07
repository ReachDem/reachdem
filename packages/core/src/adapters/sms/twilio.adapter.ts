import type {
  SmsSender,
  SmsPayload,
  SmsResult,
} from "../../ports/sms-sender.port";
import { classifyError } from "./error-classifier";

/**
 * Twilio adapter — uses the REST API directly (no SDK dependency).
 * Credentials are injected at construction time from workspace config or env.
 */
export class TwilioAdapter implements SmsSender {
  readonly providerName = "twilio";

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string
  ) {}

  async send(payload: SmsPayload): Promise<SmsResult> {
    const start = Date.now();
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: payload.to,
      From: payload.from,
      Body: payload.text,
    });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(10_000), // 10 second timeout
      });

      const durationMs = Date.now() - start;
      const data = (await res.json()) as any;

      if (res.ok && data.sid) {
        return { success: true, providerMessageId: data.sid, durationMs };
      }

      const errorCode = String(data.code ?? `http_${res.status}`);
      const errorMessage = data.message ?? "Unknown Twilio error";
      return {
        success: false,
        errorCode,
        errorMessage,
        retryable: classifyError(errorCode) === "retryable",
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const isTimeout = err?.name === "TimeoutError";
      return {
        success: false,
        errorCode: isTimeout ? "timeout" : "network_error",
        errorMessage: err?.message ?? "Network error",
        retryable: true,
        durationMs,
      };
    }
  }
}
