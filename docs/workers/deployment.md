# Déploiement des workers

## Validation locale

```bash
pnpm workers:test
pnpm workers:check
pnpm workers:env:audit
```

## Types Cloudflare

```bash
pnpm workers:types
```

Chaque worker génère ses types depuis son propre `wrangler.jsonc`.

## Déploiement staging

```bash
pnpm workers:deploy:staging
```

Pour synchroniser automatiquement les URLs récupérées dans Vercel `preview` et `development` :

```bash
node scripts/workers-deploy-and-sync.mjs --env staging --sync-vercel
```

## Déploiement production

```bash
pnpm workers:deploy:production
```

Pour synchroniser automatiquement les URLs récupérées dans Vercel `production` :

```bash
node scripts/workers-deploy-and-sync.mjs --env production --sync-vercel
```

## Secrets Cloudflare

Les secrets sont posés worker par worker :

```bash
cd apps/worker-email
wrangler secret put REACHDEM_WORKER_INTERNAL_SECRET --env staging
wrangler secret put EMAIL_ALIBABA_ACCESS_KEY_ID --env staging
```

Ne jamais coller les valeurs dans les logs ou dans une issue.

## Rollback

Utiliser les rollbacks Cloudflare par worker. Si le web a déjà été synchronisé vers une URL fautive, remettre les anciennes valeurs Vercel avec `vercel env rm` puis `vercel env add`, puis `vercel env pull .env.local --yes` dans `apps/web`.
