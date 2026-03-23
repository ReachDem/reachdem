export const scheduledWorkerConfig = {
  cron: "* * * * *",
  smsClaimBatchSize: 100,
  emailClaimBatchSize: 50,
} as const;
