# Runbook : variable d'environnement manquante

Symptôme : erreur `[Env:<scope>] <VARIABLE>`.

1. Identifier le worker dans le champ `scope`.
2. Lire `docs/workers/environment.md` pour connaître la variable attendue.
3. Poser la variable via `wrangler secret put` si c’est un secret, ou dans `wrangler.jsonc` si c’est une valeur publique non sensible.
4. Redéployer le worker.
5. Lancer `/health` puis un smoke test protégé si nécessaire.
