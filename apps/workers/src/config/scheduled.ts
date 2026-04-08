export const scheduledWorkerConfig = {
  cron: "* * * * *",
  campaignClaimBatchSize: 50,
  smsClaimBatchSize: 100,
  emailClaimBatchSize: 50,
  webhookDeliveryBatchSize: 50,
} as const;
