# Worker SMS

Responsabilité : consommer les jobs SMS et envoyer via les providers SMS configurés dans le core.

Queue : `reachdem-sms-queue`, suffixée par environnement.

Variables :

- `SMS_AVLYTEXT_API_KEY`
- `SMS_MBOA_USER_ID`
- `SMS_MBOA_API_PASSWORD`
- `SMS_LMT_API_KEY`
- `SMS_LMT_SECRET`

Tests : `pnpm --filter @reachdem/worker-sms test`.
