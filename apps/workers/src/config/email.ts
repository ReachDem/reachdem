export const emailWorkerConfig = {
  queueName: "reachdem-email-queue",
  consumer: {
    maxBatchSize: 40,
    maxBatchTimeoutSeconds: 2,
    maxConcurrency: 5,
    infraMaxRetries: 5,
  },
  execution: {
    maxDeliveryCycles: 3,
  },
} as const;

export function getEmailQueueName(environment?: string): string {
  return environment === "production"
    ? `${emailWorkerConfig.queueName}-production`
    : emailWorkerConfig.queueName;
}
