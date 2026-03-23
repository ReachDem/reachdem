import type { CampaignLaunchJob } from "@reachdem/shared";

const DEFAULT_WORKER_BASE_URL = "http://127.0.0.1:8787";

function requireWorkerBaseUrl(): string {
  const baseUrl =
    process.env.CAMPAIGN_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL ??
    DEFAULT_WORKER_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "Missing worker base URL. Set CAMPAIGN_WORKER_BASE_URL or CLOUDFLARE_WORKER_BASE_URL."
    );
  }

  return baseUrl;
}

export async function publishCampaignLaunchJob(
  job: CampaignLaunchJob
): Promise<void> {
  // TODO: once web production is deployed, keep this pointed at the same
  // worker environment that exposes /queue/campaign-launch.
  const baseUrl = requireWorkerBaseUrl();

  const response = await fetch(`${baseUrl}/queue/campaign-launch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to publish campaign launch job (HTTP ${response.status})${errorText ? `: ${errorText}` : ""}`
    );
  }
}
