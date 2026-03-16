import type {
  SmsSender,
  SmsPayload,
  SmsResult,
} from "../../ports/sms-sender.port";
import { classifyError } from "./error-classifier";

/**
 * AvlyText SMS adapter — REST API v1.
 * Docs: https://documenter.getpostman.com/view/5030929/TzRX85Be?version=latest
 *
 * Auth: query param `api_key`
 * Send: POST https://api.avlytext.com/v1/sms?api_key=...
 * Body: { sender, recipient, text }
 *
 * HTTP 200 -> success   { id: string, cost: number, parts: number }
 * HTTP 401/402/403/404/422 -> provider-side error
 */
export class AvlytextAdapter implements SmsSender {
  readonly providerName = "avlytext";

  private static readonly BASE_URL = "https://api.avlytext.com/v1";

  constructor(private readonly apiKey: string) {}

  async send(payload: SmsPayload): Promise<SmsResult> {
    const start = Date.now();
    const url = new URL(`${AvlytextAdapter.BASE_URL}/sms`);
    url.searchParams.set("api_key", this.apiKey);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: payload.from,
          recipient: payload.to,
          text: payload.text,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const durationMs = Date.now() - start;
      const data = (await res.json().catch(() => ({}))) as Record<string, any>;

      if (res.ok && typeof data.id === "string") {
        return {
          success: true,
          providerMessageId: data.id,
          durationMs,
        };
      }

      const errorCode = String(
        data.code ?? data.errorCode ?? `avlytext_http_${res.status}`
      );
      const errorMessage =
        data.message ?? data.error ?? `AvlyText error (HTTP ${res.status})`;

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
