import type { EmailExecutionJob } from "@reachdem/shared";
import { WorkerJobClient } from "./worker-job-client";

export async function publishEmailJob(job: EmailExecutionJob): Promise<void> {
  await WorkerJobClient.publish("email", job);
}
