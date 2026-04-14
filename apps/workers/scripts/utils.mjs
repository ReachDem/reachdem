import { randomUUID } from "node:crypto";

export function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getWorkerBaseUrl() {
  return (
    process.env.CLOUDFLARE_WORKER_BASE_URL ||
    process.env.SMS_WORKER_BASE_URL ||
    process.env.EMAIL_WORKER_BASE_URL ||
    "http://127.0.0.1:8787"
  );
}

export async function getJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const body =
    text.length === 0
      ? null
      : contentType.includes("application/json")
        ? JSON.parse(text)
        : text;

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${text}`);
  }

  return body;
}

export async function postJson(url, payload) {
  return getJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function createSmsExecutionJob() {
  return {
    message_id: `remote-sms-${randomUUID()}`,
    organization_id: requireEnv("TEST_ORG_ID"),
    channel: "sms",
    delivery_cycle: 1,
  };
}

export function createEmailExecutionJob() {
  return {
    message_id: `remote-email-${randomUUID()}`,
    organization_id: requireEnv("TEST_ORG_ID"),
    channel: "email",
    delivery_cycle: 1,
  };
}
