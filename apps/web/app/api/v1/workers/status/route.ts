import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";

import { getWorkerRuntimeStatus } from "@/lib/worker-status";

export const GET = withWorkspace(async () => {
  try {
    const status = await getWorkerRuntimeStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      {
        reachable: false,
        healthy: false,
        error: error instanceof Error ? error.message : "Worker status failed",
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});
