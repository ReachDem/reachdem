import type { Env } from "./types";

function isMissing(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

function requireKeys(scope: string, env: Env, keys: Array<keyof Env>): void {
  const missing = keys.filter((key) => {
    const value = env[key];
    return typeof value !== "string" || isMissing(value);
  });

  if (missing.length > 0) {
    throw new Error(
      `[Env:${scope}] Missing required environment variable(s): ${missing.join(", ")}`
    );
  }
}

export function requireBaseWorkerEnv(env: Env): void {
  requireKeys("base", env, ["ENVIRONMENT"]);
}

export function requireCampaignWorkerEnv(env: Env): void {
  requireBaseWorkerEnv(env);
}

export function requireSmsWorkerEnv(env: Env): void {
  requireKeys("sms", env, [
    "ENVIRONMENT",
    "AVLYTEXT_API_KEY",
    "MBOA_SMS_USERID",
    "MBOA_SMS_API_PASSWORD",
  ]);
}

export function requireEmailWorkerEnv(env: Env): void {
  requireKeys("email", env, [
    "ENVIRONMENT",
    "ALIBABA_ACCESS_KEY_ID",
    "ALIBABA_ACCESS_KEY_SECRET",
  ]);
}

export function requireWhatsAppWorkerEnv(env: Env): void {
  requireKeys("whatsapp", env, [
    "ENVIRONMENT",
    "EVOLUTION_API_BASE_URL",
    "EVOLUTION_API_KEY",
  ]);
}

export function requireScheduledWorkerEnv(env: Env): void {
  requireKeys("scheduled", env, [
    "ENVIRONMENT",
    "API_BASE_URL",
    "INTERNAL_API_SECRET",
  ]);
}
