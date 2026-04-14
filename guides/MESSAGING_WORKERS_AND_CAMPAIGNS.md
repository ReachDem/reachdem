# Messaging Workers And Campaigns

Ce guide résume le flow actuel d'envoi de messages ReachDem, les tests réels disponibles, et la manière de tester le scheduling à `+5 min` ou à une heure précise.

## Vue d'ensemble

L'envoi de messages n'est plus fait dans le cycle HTTP principal.

Le flow standard est:

1. l'API `apps/web` valide la requête et crée un `Message`
2. le message est créé en `queued` ou `scheduled`
3. un job est publié vers le worker Cloudflare
4. le worker consomme la queue ou le cron
5. le provider réel est appelé
6. les `message_attempts` et statuts sont persistés

Les campagnes s'appuient sur le même pipeline:

1. création d'une campagne `sms` ou `email`
2. définition de l'audience (`group` / `segment`)
3. `launch`
4. création des `campaign_targets`
5. création des `messages` liés à la campagne
6. queue immédiate ou scheduling selon `campaign.scheduledAt`
7. finalisation de la campagne en `completed`, `partial` ou `failed`

## Contrat campagne

Le modèle campagne est multi-canal:

- `channel = "sms" | "email"`
- `content` est un JSON structuré

SMS:

```json
{
  "text": "Bonjour depuis ReachDem",
  "from": "ReachDem Orange"
}
```

Email:

```json
{
  "subject": "Welcome",
  "html": "<p>Hello</p>",
  "from": "ReachDem Notifications"
}
```

## Tests réels disponibles

### SMS directs

```bash
pnpm exec dotenv -e .env -e apps/web/.env.local -- pnpm --filter @reachdem/core test -- sms.providers.direct.integration.test.ts
```

### Email direct SMTP

```bash
pnpm exec dotenv -e .env -e apps/web/.env.local -- pnpm --filter @reachdem/workers test -- email.smtp.direct.integration.test.ts
```

### Queue réelle

SMS:

```bash
pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/messaging.queue.real.integration.test.ts
```

Email:

```bash
pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/email.integration.test.ts
```

### Campagnes réelles

SMS:

```bash
pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/campaigns.sms.real.integration.test.ts
```

Email:

```bash
pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/campaigns.email.real.integration.test.ts
```

## Tester le schedule à +5 minutes

Par défaut, les tests `scheduled` créent un message dans le passé immédiat pour être traités sans attente.

Deux modes sont maintenant possibles:

- `simulated-future`
  - le message est programmé dans le futur
  - le test simule le cron au bon timestamp sans attendre réellement
- `real-future`
  - le message est programmé dans le futur
  - le test attend réellement l'heure prévue avant de déclencher le cron

Variables supportées:

- `TEST_SCHEDULE_DELAY_MINUTES`
- `TEST_SCHEDULE_AT`
- `TEST_WAIT_FOR_SCHEDULE`

### Exemple: test programmé à +5 min sans attendre réellement

```bash
TEST_SCHEDULE_DELAY_MINUTES=5 \
pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/messaging.scheduled.real.integration.test.ts
```

ou:

```bash
TEST_SCHEDULE_DELAY_MINUTES=5 \
pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/email.scheduled.integration.test.ts
```

### Exemple: test programmé à +5 min avec vraie attente

```bash
TEST_SCHEDULE_DELAY_MINUTES=5 \
TEST_WAIT_FOR_SCHEDULE=true \
pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/messaging.scheduled.real.integration.test.ts
```

ou:

```bash
TEST_SCHEDULE_DELAY_MINUTES=5 \
TEST_WAIT_FOR_SCHEDULE=true \
pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/email.scheduled.integration.test.ts
```

### Exemple: heure précise

```bash
TEST_SCHEDULE_AT=2026-03-16T15:30:00+01:00 \
TEST_WAIT_FOR_SCHEDULE=true \
pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/messaging.scheduled.real.integration.test.ts
```

## Variables d'environnement utiles

Communes:

- `TEST_ORG_ID`
- `TEST_USER_ID`
- `TEST_USER_EMAIL`
- `INTERNAL_API_SECRET`

SMS:

- `TEST_CAMPAIGN_SMS_PHONES`
- `TEST_QUEUE_SMS_PHONE`
- `TEST_SCHEDULED_SMS_PHONE`
- `TEST_AVLYTEXT_SMS_SENDER`
- `LMT_SENDER_ID`
- `AVLYTEXT_API_KEY`
- `MBOA_SMS_USERID`
- `MBOA_SMS_API_PASSWORD`
- `LMT_API_KEY`
- `LMT_SECRET`

Email:

- `TEST_CAMPAIGN_EMAILS`
- `TEST_EMAIL_TO`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SECURE`
- `SENDER_EMAIL`
- `SENDER_NAME`
- `ALIBABA_SENDER_EMAIL`
- `ALIBABA_SENDER_NAME`

## Remarque importante

Le statut `sent` signifie actuellement:

- traité par notre pipeline
- accepté par le provider

Il ne signifie pas encore nécessairement:

- délivré au terminal final

Pour cela, il faudra plus tard brancher les DLR / webhooks provider.
