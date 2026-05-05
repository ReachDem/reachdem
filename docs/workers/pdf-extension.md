# Extension future : worker PDF

Le worker PDF n’est pas livré en v1. Le contrat réservé devra suivre les mêmes règles :

- app séparée `apps/worker-pdf`
- queue dédiée
- schema Zod dans `packages/jobs`
- variables `PDF_*`
- stockage explicite si un bucket R2 est requis
- documentation et runbook avant déploiement

Aucun code runtime PDF ne doit être ajouté tant que le produit n’a pas validé les formats, le stockage et le cycle de vie des documents.
