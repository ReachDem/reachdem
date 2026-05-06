export const workers = [
  {
    domain: "email",
    packageName: "@reachdem/worker-email",
    dir: "apps/worker-email",
    workerNames: {
      staging: "reachdem-worker-email-staging",
      production: "reachdem-worker-email",
    },
    vercelUrlEnv: "REACHDEM_WORKER_EMAIL_URL",
    cloudflareSecrets: [
      "REACHDEM_WORKER_INTERNAL_SECRET",
      "DATABASE_URL",
      "PRISMA_ACCELERATE_URL",
      "EMAIL_ALIBABA_ACCESS_KEY_ID",
      "EMAIL_ALIBABA_ACCESS_KEY_SECRET",
      "EMAIL_SENDER_ADDRESS",
      "EMAIL_SENDER_NAME",
    ],
  },
  {
    domain: "sms",
    packageName: "@reachdem/worker-sms",
    dir: "apps/worker-sms",
    workerNames: {
      staging: "reachdem-worker-sms-staging",
      production: "reachdem-worker-sms",
    },
    vercelUrlEnv: "REACHDEM_WORKER_SMS_URL",
    cloudflareSecrets: [
      "REACHDEM_WORKER_INTERNAL_SECRET",
      "DATABASE_URL",
      "PRISMA_ACCELERATE_URL",
      "SMS_AVLYTEXT_API_KEY",
      "SMS_MBOA_USER_ID",
      "SMS_MBOA_API_PASSWORD",
    ],
  },
  {
    domain: "whatsapp",
    packageName: "@reachdem/worker-whatsapp",
    dir: "apps/worker-whatsapp",
    workerNames: {
      staging: "reachdem-worker-whatsapp-staging",
      production: "reachdem-worker-whatsapp",
    },
    vercelUrlEnv: "REACHDEM_WORKER_WHATSAPP_URL",
    cloudflareSecrets: [
      "REACHDEM_WORKER_INTERNAL_SECRET",
      "DATABASE_URL",
      "PRISMA_ACCELERATE_URL",
      "WHATSAPP_EVOLUTION_API_BASE_URL",
      "WHATSAPP_EVOLUTION_API_KEY",
    ],
  },
  {
    domain: "campaign",
    packageName: "@reachdem/worker-campaign",
    dir: "apps/worker-campaign",
    workerNames: {
      staging: "reachdem-worker-campaign-staging",
      production: "reachdem-worker-campaign",
    },
    vercelUrlEnv: "REACHDEM_WORKER_CAMPAIGN_URL",
    cloudflareSecrets: [
      "REACHDEM_WORKER_INTERNAL_SECRET",
      "DATABASE_URL",
      "PRISMA_ACCELERATE_URL",
    ],
  },
  {
    domain: "scheduler",
    packageName: "@reachdem/worker-scheduler",
    dir: "apps/worker-scheduler",
    workerNames: {
      staging: "reachdem-worker-scheduler-staging",
      production: "reachdem-worker-scheduler",
    },
    vercelUrlEnv: "REACHDEM_WORKER_SCHEDULER_URL",
    cloudflareSecrets: [
      "REACHDEM_WORKER_INTERNAL_SECRET",
      "DATABASE_URL",
      "PRISMA_ACCELERATE_URL",
    ],
  },
];

export const vercelSecretEnvs = ["REACHDEM_WORKER_INTERNAL_SECRET"];

export const vercelEnvironmentsByDeployEnv = {
  staging: ["preview:current", "development"],
  production: ["production"],
};

export const vercelDatabaseEnvironmentsByDeployEnv = {
  staging: ["development", "preview:current", "preview:develop"],
  production: ["production"],
};
