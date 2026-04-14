import type {
  SmsSender,
  SmsPayload,
  SmsResult,
} from "../../ports/sms-sender.port";
import { classifyError } from "./error-classifier";

/**
 * Infobip adapter — uses the REST API directly (no SDK dependency).
 */
export class InfobipAdapter implements SmsSender {
  readonly providerName = "infobip";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string // e.g. https://XXXX.api.infobip.com
  ) {}

  async send(payload: SmsPayload): Promise<SmsResult> {
    const start = Date.now();
    const url = `${this.baseUrl}/sms/2/text/single`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `App ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          from: payload.from,
          to: payload.to,
          text: payload.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      const durationMs = Date.now() - start;
      const data = (await res.json()) as any;

      if (res.ok) {
        const msg = data.messages?.[0];
        if (msg && msg.status?.groupName === "PENDING") {
          return {
            success: true,
            providerMessageId: msg.messageId,
            durationMs,
            httpStatus: res.status,
            responseMeta: {
              messageId: msg.messageId ?? null,
              statusId: msg.status?.id ?? null,
              groupName: msg.status?.groupName ?? null,
              description: msg.status?.description ?? null,
            },
          };
        }
        // Infobip sometimes returns 200 with an error in body
        const errorCode = msg?.status?.id ?? `infobip_${res.status}`;
        const errorMessage =
          msg?.status?.description ?? "Unknown Infobip error";
        return {
          success: false,
          errorCode: String(errorCode),
          errorMessage,
          retryable: classifyError(String(errorCode)) === "retryable",
          durationMs,
          httpStatus: res.status,
          responseMeta: {
            messageId: msg?.messageId ?? null,
            statusId: msg?.status?.id ?? null,
            groupName: msg?.status?.groupName ?? null,
            description: msg?.status?.description ?? null,
          },
        };
      }

      const errorCode = String(
        data.requestError?.serviceException?.messageId ?? `http_${res.status}`
      );
      const errorMessage =
        data.requestError?.serviceException?.text ?? "Unknown Infobip error";
      return {
        success: false,
        errorCode,
        errorMessage,
        retryable: classifyError(errorCode) === "retryable",
        durationMs,
        httpStatus: res.status,
        responseMeta: {
          messageId: data.requestError?.serviceException?.messageId ?? null,
          text: data.requestError?.serviceException?.text ?? null,
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
