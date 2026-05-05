import type { SmsExecutionJob } from "@reachdem/shared";

const DEFAULT_WORKER_BASE_URL = "http://127.0.0.1:8787";

export async function publishSmsJob(job: SmsExecutionJob): Promise<void> {
  const baseUrl =
    process.env.SMS_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL ??
    DEFAULT_WORKER_BASE_URL;

  const response = await fetch(`${baseUrl}/queue/sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to publish SMS job (HTTP ${response.status})${errorText ? `: ${errorText}` : ""}`
    );
  }
}
