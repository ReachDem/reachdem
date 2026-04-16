export const scheduledWorkerConfig = {
  cron: "* * * * *",
  campaignClaimBatchSize: 50,
  smsClaimBatchSize: 100,
  emailClaimBatchSize: 50,
  authDeferredEmailBatchSize: 50,
} as const;
