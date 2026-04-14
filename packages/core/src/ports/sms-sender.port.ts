// ─── SMS Sender Port (Interface) ─────────────────────────────────────────────
// All provider adapters must implement this contract.
// Adding a new provider only requires creating a new adapter — no changes to
// the use case or composite sender.

export interface SmsPayload {
  /** Destination phone in E.164 format (e.g. +2376XXXXXXXX) */
  to: string;
  /** SMS text content */
  text: string;
  /** Sender ID or shortcode */
  from: string;
}

export type SmsResult =
  | {
      success: true;
      providerMessageId: string;
      durationMs: number;
      httpStatus?: number;
      responseMeta?: Record<string, unknown>;
    }
  | {
      success: false;
      errorCode: string;
      errorMessage: string;
      /**
       * true  → retryable (5xx, network, rate_limit) → fallback allowed
       * false → final error (invalid_number, opt_out) → no fallback
       */
      retryable: boolean;
      durationMs: number;
      httpStatus?: number;
      responseMeta?: Record<string, unknown>;
    };

export interface SmsSender {
  /** Lowercased provider name — must match SmsProvider enum  */
  readonly providerName: string;
  send(payload: SmsPayload): Promise<SmsResult>;
}
