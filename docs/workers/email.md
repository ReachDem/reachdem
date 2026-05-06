# Worker email

Responsabilité : consommer les jobs email et envoyer via Alibaba Direct Mail.

Queue : `reachdem-email-queue`, suffixée par environnement.

Endpoint :

- `GET /health`
- `POST /queue/email`
- `GET /queue/status`

Variables :

- `EMAIL_ALIBABA_ACCESS_KEY_ID`
- `EMAIL_ALIBABA_ACCESS_KEY_SECRET`
- `EMAIL_ALIBABA_REGION`
- `EMAIL_SENDER_ADDRESS`
- `EMAIL_SENDER_NAME`

Tests : `pnpm --filter @reachdem/worker-email test`.
