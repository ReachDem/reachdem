import type { EmailExecutionJob } from "@reachdem/shared";

const DEFAULT_WORKER_BASE_URL = "http://127.0.0.1:8787";

export async function publishEmailJob(job: EmailExecutionJob): Promise<void> {
  const baseUrl =
    process.env.EMAIL_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL ??
    DEFAULT_WORKER_BASE_URL;

  const response = await fetch(`${baseUrl}/queue/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to publish Email job (HTTP ${response.status})${errorText ? `: ${errorText}` : ""}`
    );
  }
}
