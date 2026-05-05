import type { SmsExecutionJob } from "@reachdem/shared";
import { WorkerJobClient } from "./worker-job-client";

export async function publishSmsJob(job: SmsExecutionJob): Promise<void> {
  await WorkerJobClient.publish("sms", job);
}
