import type {
  CampaignLaunchJob,
  EmailExecutionJob,
  SmsExecutionJob,
  WhatsAppExecutionJob,
} from "@reachdem/shared";

type WorkerJobMap = {
  campaign: CampaignLaunchJob;
  email: EmailExecutionJob;
  sms: SmsExecutionJob;
  whatsapp: WhatsAppExecutionJob;
};

type WorkerJobDomain = keyof WorkerJobMap;

const workerConfig = {
  campaign: {
    urlEnv: "REACHDEM_WORKER_CAMPAIGN_URL",
    path: "/queue/campaign-launch",
  },
  email: {
    urlEnv: "REACHDEM_WORKER_EMAIL_URL",
    path: "/queue/email",
  },
  sms: {
    urlEnv: "REACHDEM_WORKER_SMS_URL",
    path: "/queue/sms",
  },
  whatsapp: {
    urlEnv: "REACHDEM_WORKER_WHATSAPP_URL",
    path: "/queue/whatsapp",
  },
} as const satisfies Record<WorkerJobDomain, { urlEnv: string; path: string }>;

function requireServerEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required worker environment variable: ${name}`);
  }

  return value;
}

function resolveWorkerUrl(domain: WorkerJobDomain): URL {
  const config = workerConfig[domain];
  const baseUrl = requireServerEnv(config.urlEnv);

  try {
    return new URL(
      config.path,
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
    );
  } catch {
    throw new Error(`${config.urlEnv} must be a valid URL`);
  }
}

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text.slice(0, 1000);
}

export class WorkerJobClient {
  static async publish<TDomain extends WorkerJobDomain>(
    domain: TDomain,
    job: WorkerJobMap[TDomain]
  ): Promise<void> {
    const targetUrl = resolveWorkerUrl(domain);
    const internalSecret = requireServerEnv("REACHDEM_WORKER_INTERNAL_SECRET");

    console.log("[WorkerJobClient] Publish starting", {
      domain,
      targetUrl: targetUrl.toString(),
    });

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify(job),
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      console.error("[WorkerJobClient] Publish failed", {
        domain,
        targetUrl: targetUrl.toString(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    if (!response.ok) {
      const body = await readErrorBody(response);
      console.error("[WorkerJobClient] Publish returned error", {
        domain,
        targetUrl: targetUrl.toString(),
        status: response.status,
        body,
      });
      throw new Error(
        `Failed to publish ${domain} worker job (HTTP ${response.status})${body ? `: ${body}` : ""}`
      );
    }

    console.log("[WorkerJobClient] Publish completed", {
      domain,
      targetUrl: targetUrl.toString(),
      status: response.status,
    });
  }
}
