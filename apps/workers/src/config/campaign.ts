export const campaignWorkerConfig = {
  queueName: "reachdem-campaign-launch-queue",
  consumer: {
    maxBatchSize: 5,
    maxBatchTimeoutSeconds: 2,
    maxConcurrency: 2,
    infraMaxRetries: 5,
  },
  audiencePageSize: 500,
  targetInsertBatchSize: 500,
  messagePublishBatchSize: 100,
} as const;
