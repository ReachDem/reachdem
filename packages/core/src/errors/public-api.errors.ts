export type PublicApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_api_key"
  | "api_key_revoked"
  | "insufficient_scope"
  | "missing_idempotency_key"
  | "idempotency_conflict"
  | "idempotency_processing"
  | "validation_error"
  | "internal_error";

export class PublicApiError extends Error {
  constructor(
    public readonly code: PublicApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

export function toPublicApiErrorResponse(error: PublicApiError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}
