// ─── Onboarding Types ────────────────────────────────────────────────────────────

export type ReachDemRole = "ENTREPRENEUR" | "MARKETER" | "SALES" | "DEVELOPER";

export type OnboardingCurrentStep =
  | "register"
  | "verify_email"
  | "workspace"
  | "profile"
  | "acquisition"
  | "transition"
  | "dashboard_checklist";

export type AcquisitionSource =
  | "linkedin"
  | "facebook"
  | "google"
  | "tiktok"
  | "friend_colleague"
  | "other";

export interface OnboardingStateDTO {
  id: string;
  userId: string;
  organizationId?: string | null;
  role?: ReachDemRole | null;
  acquisitionSource?: AcquisitionSource | null;
  acquisitionOther?: string | null;
  status: "in_progress" | "completed" | "skipped";
  currentStep: OnboardingCurrentStep;
  step1CompletedAt?: Date | null;
  step2CompletedAt?: Date | null;
  step3CompletedAt?: Date | null;
  skippedAt?: Date | null;
  completedAt?: Date | null;
  uiState?: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardChecklistStep {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "done";
  href?: string;
}

// ─── Password Validation Constants ──────────────────────────────────────────────

export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

// Simple reusable Regex based on the rules ABOVE
export const PASSWORD_REGEX = {
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_]/,
};
