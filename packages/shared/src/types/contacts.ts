// ─── Contact Types ────────────────────────────────────────────────────────────

export interface CreateContactInput {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneE164?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  city?: string | null;
  country?: string | null;
  customFields?: Record<string, unknown> | null;
}

export type UpdateContactInput = Partial<CreateContactInput>;

export interface GetContactsOptions {
  q?: string | null;
  page: number;
  limit: number;
}

// ─── Contact Field Types ──────────────────────────────────────────────────────

export type ContactFieldType =
  | "TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "URL"
  | "DATE"
  | "SELECT";

export interface CreateContactFieldInput {
  key: string;
  label: string;
  type: ContactFieldType;
  isRequired?: boolean;
  options?: string[] | null;
}

export interface UpdateContactFieldInput {
  label?: string;
  isRequired?: boolean;
  options?: string[] | null;
  isActive?: boolean;
}

// ─── Contact Field Error ──────────────────────────────────────────────────────

export type ContactFieldErrorCode =
  | "QUOTA_EXCEEDED"
  | "DUPLICATE_KEY"
  | "NOT_FOUND"
  | "INVALID_TYPE";

export class ContactFieldError extends Error {
  constructor(
    public readonly code: ContactFieldErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ContactFieldError";
  }
}
