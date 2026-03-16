import type {
  SmsSender,
  SmsPayload,
  SmsResult,
} from "../../ports/sms-sender.port";
import { classifyError } from "./error-classifier";

/**
 * LMT Group SMS adapter — REST API v1.
 * Docs: https://sms.lmtgroup.com/
 *
 * Auth :  X-Api-Key  +  X-Secret  headers
 * Push :  POST https://sms.lmtgroup.com/api/v1/pushes
 * Body :  { message, senderId, msisdn: string[], flag? }
 *
 * HTTP 201 → success   { id: string, … }
 * HTTP 400 → bad request
 * HTTP 401 → invalid credentials
 */
export class LmtAdapter implements SmsSender {
  readonly providerName = "lmt";

  private static readonly BASE_URL = "https://sms.lmtgroup.com/api/v1";

  constructor(
    private readonly apiKey: string,
    private readonly secret: string
  ) {}

  async send(payload: SmsPayload): Promise<SmsResult> {
    const start = Date.now();
    const url = `${LmtAdapter.BASE_URL}/pushes`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
          "X-Secret": this.secret,
        },
        body: JSON.stringify({
          message: payload.text,
          senderId: payload.from,
          // LMT n'accepte pas le + en préfixe E.164
          msisdn: [payload.to.replace(/^\+/, "")],
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const durationMs = Date.now() - start;

      // 401 → bad credentials (final, no fallback)
      if (res.status === 401) {
        return {
          success: false,
          errorCode: "lmt_unauthorized",
          errorMessage:
            "LMT authentication failed — check X-Api-Key / X-Secret",
          retryable: false,
          durationMs,
        };
      }

      const data = (await res.json().catch(() => ({}))) as Record<string, any>;

      // 201 → success
      if (res.status === 201) {
        const providerMessageId = String(
          data.id ?? data.pushId ?? data.messageId ?? "lmt_ok"
        );
        return { success: true, providerMessageId, durationMs };
      }

      // 400 → bad request (typically invalid number, wrong senderId, etc.)
      const errorCode = String(
        data.code ?? data.errorCode ?? `lmt_http_${res.status}`
      );
      const errorMessage =
        data.message ?? data.error ?? `LMT error (HTTP ${res.status})`;

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
