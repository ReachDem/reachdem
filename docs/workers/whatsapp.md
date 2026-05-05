# Worker WhatsApp

Responsabilité : consommer les jobs WhatsApp, gérer la session Evolution et finaliser le lifecycle message/campagne.

Queue : `reachdem-whatsapp-queue`, suffixée par environnement.

Variables :

- `WHATSAPP_EVOLUTION_API_BASE_URL`
- `WHATSAPP_EVOLUTION_API_KEY`
- `WHATSAPP_EVOLUTION_INSTANCE_PREFIX`

Tests : `pnpm --filter @reachdem/worker-whatsapp test`.
