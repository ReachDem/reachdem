import type {
  SmsSender,
  SmsPayload,
  SmsResult,
} from "../../ports/sms-sender.port";
import { classifyError } from "./error-classifier";

/**
 * LMT Group SMS adapter - REST API v1.
 * Docs: https://sms.lmtgroup.com/
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
          msisdn: [payload.to.replace(/^\+/, "")],
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const durationMs = Date.now() - start;

      if (res.status === 401) {
        return {
          success: false,
          errorCode: "lmt_unauthorized",
          errorMessage:
            "LMT authentication failed - check X-Api-Key / X-Secret",
          retryable: false,
          durationMs,
          httpStatus: res.status,
          responseMeta: {
            status: res.status,
          },
        };
      }

      const data = (await res.json().catch(() => ({}))) as Record<string, any>;

      if (res.status === 201) {
        const providerMessageId = String(
          data.id ?? data.pushId ?? data.messageId ?? "lmt_ok"
        );

        return {
          success: true,
          providerMessageId,
          durationMs,
          httpStatus: res.status,
          responseMeta: {
            id: data.id ?? null,
            pushId: data.pushId ?? null,
            messageId: data.messageId ?? null,
          },
        };
      }

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
        httpStatus: res.status,
        responseMeta: {
          code: data.code ?? null,
          errorCode: data.errorCode ?? null,
          message: data.message ?? null,
          error: data.error ?? null,
        },
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
        responseMeta: {
          errorName: err?.name ?? null,
        },
      };
    }
  }
}
