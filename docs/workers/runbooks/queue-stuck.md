# Runbook : queue bloquée

Symptôme : messages qui restent dans la queue ou retries continus.

1. Vérifier que le `wrangler.jsonc` du worker consomme la bonne queue pour l’environnement.
2. Comparer avec `@reachdem/jobs` et `pnpm workers:env:audit`.
3. Vérifier les secrets/env du worker.
4. Regarder les erreurs `queue.message.retry`.
5. Si la queue reçoit le mauvais payload, corriger le publisher web ou scheduler avant de rejouer.
