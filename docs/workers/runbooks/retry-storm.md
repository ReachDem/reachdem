# Runbook : retry storm

Symptôme : beaucoup de retries sur un court intervalle.

1. Identifier le domaine via les logs structurés.
2. Vérifier si l’erreur est configuration, provider ou DB.
3. Ne pas augmenter `max_retries` sans traiter la cause.
4. Si la cause est provider, réduire `max_concurrency` temporairement.
5. Si la cause est env, corriger la variable et redéployer.
