export interface WorkerRuntimeStatus {
  reachable: boolean;
  healthy: boolean;
  environment?: string;
  queues?: string[];
  error?: string;
  checkedAt: string;
}

const DEFAULT_WORKER_BASE_URL = "http://127.0.0.1:8787";

function getWorkerBaseUrl(): string {
  return (
    process.env.CAMPAIGN_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL ??
    DEFAULT_WORKER_BASE_URL
  );
}

export async function getWorkerRuntimeStatus(): Promise<WorkerRuntimeStatus> {
  const baseUrl = getWorkerBaseUrl();
  console.log("[Worker Status] Checking worker runtime", { baseUrl });

  try {
    const [healthResponse, queueStatusResponse] = await Promise.all([
      fetch(`${baseUrl}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      }),
      fetch(`${baseUrl}/queue/status`, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      }),
    ]);

    console.log("[Worker Status] Raw responses", {
      baseUrl,
      healthStatus: healthResponse.status,
      queueStatus: queueStatusResponse.status,
    });

    if (!healthResponse.ok) {
      throw new Error(`Worker health returned HTTP ${healthResponse.status}`);
    }

    if (!queueStatusResponse.ok) {
      throw new Error(
        `Worker queue status returned HTTP ${queueStatusResponse.status}`
      );
    }

    const healthText = await healthResponse.text();
    const queueText = await queueStatusResponse.text();

    let healthPayload: {
      status?: string;
    };
    let queuePayload: {
      environment?: string;
      queues?: string[];
    };

    try {
      healthPayload = JSON.parse(healthText) as {
        status?: string;
      };
    } catch {
      throw new Error(
        `Worker health returned non-JSON payload: ${healthText.slice(0, 120)}`
      );
    }

    try {
      queuePayload = JSON.parse(queueText) as {
        environment?: string;
        queues?: string[];
      };
    } catch {
      throw new Error(
        `Worker queue status returned non-JSON payload: ${queueText.slice(0, 120)}`
      );
    }

    console.log("[Worker Status] Worker runtime reachable", {
      baseUrl,
      health: healthPayload.status,
      environment: queuePayload.environment,
      queues: queuePayload.queues ?? [],
    });

    return {
      reachable: true,
      healthy: healthPayload.status === "ok",
      environment: queuePayload.environment,
      queues: queuePayload.queues ?? [],
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Worker Status] Worker runtime unreachable", {
      baseUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      reachable: false,
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown worker error",
      checkedAt: new Date().toISOString(),
    };
  }
}
