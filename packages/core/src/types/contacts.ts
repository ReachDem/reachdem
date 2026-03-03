export type ContactFieldErrorCode =
  | "QUOTA_EXCEEDED"
  | "DUPLICATE_KEY"
  | "NOT_FOUND";

export class ContactFieldError extends Error {
  constructor(
    public readonly code: ContactFieldErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ContactFieldError";
  }
}
