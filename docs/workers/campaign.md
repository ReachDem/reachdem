# Worker campaign

Responsabilité : consommer les jobs de lancement campagne, créer les messages et publier les jobs canal.

Queue consommée : `reachdem-campaign-launch-queue`.

Queues produites :

- SMS
- Email
- WhatsApp

Tests : `pnpm --filter @reachdem/worker-campaign test`.
