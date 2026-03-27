import type {
  SmsSender,
  SmsPayload,
  SmsResult,
} from "../../ports/sms-sender.port";
import { classifyError } from "./error-classifier";

/**
 * MboaSMS adapter — REST API v1.
 *
 * Send: POST https://mboadeals.net/api/v1/sms/sendsms
 * Body: { user_id, password, message, phone_str, sender_name }
 */
export class MboaSmsAdapter implements SmsSender {
  readonly providerName = "mboaSms";

  private static readonly URL = "https://mboadeals.net/api/v1/sms/sendsms";

  constructor(
    private readonly userId: string,
    private readonly password: string
  ) {}

  async send(payload: SmsPayload): Promise<SmsResult> {
    const start = Date.now();

    try {
      const res = await fetch(MboaSmsAdapter.URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user_id: this.userId,
          password: this.password,
          message: payload.text,
          phone_str: payload.to,
          sender_name: payload.from,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const durationMs = Date.now() - start;
      const data = (await res.json().catch(() => ({}))) as Record<string, any>;
      const success = data.success === true || data.message === "SUCCESS";

      if (res.ok && success) {
        return {
          success: true,
          providerMessageId: String(
            data.id ?? data.messageId ?? data.reference ?? "mboasms_ok"
          ),
          durationMs,
          httpStatus: res.status,
          responseMeta: {
            id: data.id ?? null,
            messageId: data.messageId ?? null,
            reference: data.reference ?? null,
            message: data.message ?? null,
          },
        };
      }

      const errorCode = String(
        data.code ?? data.errorCode ?? `mboasms_http_${res.status}`
      );
      const errorMessage =
        data.message ?? data.error ?? `MboaSMS error (HTTP ${res.status})`;

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
          success: data.success ?? null,
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
