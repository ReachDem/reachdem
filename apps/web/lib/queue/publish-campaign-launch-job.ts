import type { CampaignLaunchJob } from "@reachdem/shared";
import { WorkerJobClient } from "./worker-job-client";

export async function publishCampaignLaunchJob(
  job: CampaignLaunchJob
): Promise<void> {
  await WorkerJobClient.publish("campaign", job);
}
