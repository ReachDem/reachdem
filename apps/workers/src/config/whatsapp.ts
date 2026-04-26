export const whatsappWorkerConfig = {
  queueName: "reachdem-whatsapp-queue",
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

export function getWhatsAppQueueName(environment?: string): string {
  return environment === "production"
    ? `${whatsappWorkerConfig.queueName}-production`
    : whatsappWorkerConfig.queueName;
}
