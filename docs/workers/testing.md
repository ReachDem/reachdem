# Tests des workers

## Batterie minimale

```bash
pnpm workers:test
pnpm --filter reachdem-main test
pnpm --filter @reachdem/core test
```

## Ce que les tests doivent couvrir

- Contrats `@reachdem/jobs` : mauvais channel, queue registry, payloads incomplets.
- `@reachdem/worker-kit` : env manquante, secret invalide, ack/retry.
- Workers : `/health`, `/queue/status`, `/queue/*`, payload invalide, secret invalide.
- Web : `WorkerJobClient` envoie vers la bonne URL avec `x-internal-secret`.
- Core : lifecycle sent/failed/retry et finalisation campagne.

## Smoke tests distants

Après staging :

```bash
curl https://<worker>/health
curl -H "x-internal-secret: <secret>" https://<worker>/queue/status
```

Ne pas publier de vrais messages sans sandbox provider.
