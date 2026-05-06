# Runbook : secret interne invalide

Symptôme : `/queue/*` retourne 401.

1. Vérifier que Vercel contient `REACHDEM_WORKER_INTERNAL_SECRET` dans le bon environnement.
2. Vérifier que chaque worker Cloudflare a le même secret.
3. Relancer `vercel env pull .env.local --yes` dans `apps/web`.
4. Redéployer le web si la valeur production a changé.

Ne jamais afficher la valeur du secret dans les logs.
