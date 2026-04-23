import type { WhatsAppExecutionJob } from "@reachdem/shared";

const DEFAULT_WORKER_BASE_URL = "http://127.0.0.1:8787";

export async function publishWhatsAppJob(
  job: WhatsAppExecutionJob
): Promise<void> {
  const baseUrl =
    process.env.WHATSAPP_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL ??
    DEFAULT_WORKER_BASE_URL;

  const response = await fetch(`${baseUrl}/queue/whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to publish WhatsApp job (HTTP ${response.status})${errorText ? `: ${errorText}` : ""}`
    );
  }
}
