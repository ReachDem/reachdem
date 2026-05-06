# Runbook : provider indisponible

Symptôme : hausse des retries, messages en `queued` ou `failed`, erreurs provider dans les logs.

1. Vérifier le worker concerné : email, SMS ou WhatsApp.
2. Lire les logs Cloudflare du worker avec `wrangler tail --env <env>`.
3. Vérifier si l’erreur est retryable ou finale.
4. Si le provider est down, réduire temporairement le débit côté queue ou suspendre les campagnes.
5. Après rétablissement, vérifier les messages requeued et les stats campagne.
