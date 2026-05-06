# Worker scheduler

Responsabilité : exécuter le cron `*/5 * * * *`, claim les campagnes/messages planifiés, publier vers les queues, et déclencher les emails auth différés.

Variables :

- `SCHEDULER_API_BASE_URL`
- `REACHDEM_WORKER_INTERNAL_SECRET`

Règle : une panne deferred auth ne doit pas empêcher de comprendre les publications campagne/message dans les logs.

Tests : `pnpm --filter @reachdem/worker-scheduler test`.
