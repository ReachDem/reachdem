import type { WhatsAppExecutionJob } from "@reachdem/shared";
import { WorkerJobClient } from "./worker-job-client";

export async function publishWhatsAppJob(
  job: WhatsAppExecutionJob
): Promise<void> {
  await WorkerJobClient.publish("whatsapp", job);
}
