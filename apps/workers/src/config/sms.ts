export const smsWorkerConfig = {
  queueName: "reachdem-sms-queue",
  consumer: {
    maxBatchSize: 50,
    maxBatchTimeoutSeconds: 2,
    maxConcurrency: 10,
    infraMaxRetries: 5,
  },
  execution: {
    maxDeliveryCycles: 3,
  },
} as const;

export function getSmsQueueName(environment?: string): string {
  return environment === "production"
    ? `${smsWorkerConfig.queueName}-production`
    : smsWorkerConfig.queueName;
}
