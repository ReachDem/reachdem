import type { CampaignLaunchJob } from "@reachdem/shared";

function requireWorkerBaseUrl(): string {
  const baseUrl =
    process.env.CAMPAIGN_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL;

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
  const targetUrl = `${baseUrl}/queue/campaign-launch`;

  console.log("[Worker Publish] Campaign launch dispatch starting", {
    targetUrl,
    campaignId: job.campaign_id,
    organizationId: job.organization_id,
  });

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(job),
    });
  } catch (error) {
    console.error("[Worker Publish] Campaign launch dispatch failed", {
      targetUrl,
      campaignId: job.campaign_id,
      organizationId: job.organization_id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  console.log("[Worker Publish] Campaign launch dispatch response", {
    targetUrl,
    campaignId: job.campaign_id,
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[Worker Publish] Campaign launch dispatch returned error", {
      targetUrl,
      campaignId: job.campaign_id,
      organizationId: job.organization_id,
      status: response.status,
      body: errorText,
    });
    throw new Error(
      `Failed to publish campaign launch job (HTTP ${response.status})${errorText ? `: ${errorText}` : ""}`
    );
  }
}
