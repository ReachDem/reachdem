# Variables d'environnement des workers

Les secrets ne doivent jamais être commités. Les variables Cloudflare sont posées par worker avec Wrangler, et les URLs workers sont synchronisées côté Vercel pour `apps/web`.

## Variables Vercel `reachdem-web`

| Variable                          | Scope       | Description                                     |
| --------------------------------- | ----------- | ----------------------------------------------- |
| `REACHDEM_WORKER_INTERNAL_SECRET` | server-only | Secret partagé envoyé dans `x-internal-secret`. |
| `REACHDEM_WORKER_EMAIL_URL`       | server-only | URL publique du worker email.                   |
| `REACHDEM_WORKER_SMS_URL`         | server-only | URL publique du worker SMS.                     |
| `REACHDEM_WORKER_WHATSAPP_URL`    | server-only | URL publique du worker WhatsApp.                |
| `REACHDEM_WORKER_CAMPAIGN_URL`    | server-only | URL publique du worker campaign.                |
| `REACHDEM_WORKER_SCHEDULER_URL`   | server-only | URL publique du worker scheduler.               |

## Variables Cloudflare communes

| Variable                          | Workers        | Description                               |
| --------------------------------- | -------------- | ----------------------------------------- |
| `WORKER_ENV`                      | tous           | `development`, `staging` ou `production`. |
| `REACHDEM_WORKER_INTERNAL_SECRET` | tous           | Secret interne partagé avec Vercel.       |
| `DATABASE_URL`                    | workers métier | URL PostgreSQL directe.                   |
| `PRISMA_ACCELERATE_URL`           | workers métier | Alternative Prisma Accelerate.            |

## Variables par domaine

Email :

- `EMAIL_ALIBABA_ACCESS_KEY_ID`
- `EMAIL_ALIBABA_ACCESS_KEY_SECRET`
- `EMAIL_ALIBABA_REGION`
- `EMAIL_SENDER_ADDRESS`
- `EMAIL_SENDER_NAME`

SMS :

- `SMS_AVLYTEXT_API_KEY`
- `SMS_MBOA_USER_ID`
- `SMS_MBOA_API_PASSWORD`
- `SMS_LMT_API_KEY`
- `SMS_LMT_SECRET`

WhatsApp :

- `WHATSAPP_EVOLUTION_API_BASE_URL`
- `WHATSAPP_EVOLUTION_API_KEY`
- `WHATSAPP_EVOLUTION_INSTANCE_PREFIX`

Scheduler :

- `SCHEDULER_API_BASE_URL`

## Erreurs attendues

Une variable manquante doit produire une erreur du type `[Env:<scope>] <VARIABLE>: required variable is missing or empty`. Une URL invalide doit produire `[Env:<scope>] <VARIABLE>: must be a valid URL`.
