# Scripts

## link-campaign-stats.ts

Ce script associe les liens trackés existants avec leurs campagnes et synchronise les statistiques depuis l'API Sink.

### Utilisation

```bash
pnpm link-campaign-stats
```

### Ce que fait le script

1. Parcourt toutes les campagnes dans la base de données
2. Extrait les liens `rcdm.ink/XXXX` du contenu de chaque campagne
3. Associe ces liens avec la campagne correspondante (si pas déjà fait)
4. Synchronise les statistiques (clics totaux, clics uniques) depuis l'API Sink
5. Met à jour la base de données avec les nouvelles stats

### Quand l'utiliser

- Après avoir créé des campagnes avec des liens trackés
- Pour réparer les associations manquantes entre liens et campagnes
- Pour mettre à jour les statistiques de tous les liens en une fois

### Exemple de sortie

```
Starting campaign stats linking...

Found 3 campaigns to process

--- Processing: Summer Promo (abc-123) ---
  Found 2 link(s): vyqO, xY3a
  ✓ Associated link vyqO with campaign
  ✓ Updated stats for vyqO: 45 clicks, 32 unique
  → Link xY3a already associated
  ✓ Updated stats for xY3a: 12 clicks, 8 unique

--- Processing: Newsletter March (def-456) ---
  No rcdm.ink links found

--- Processing: Product Launch (ghi-789) ---
  Found 1 link(s): aB9z
  ✓ Associated link aB9z with campaign
  ✓ Updated stats for aB9z: 0 clicks, 0 unique

=== Summary ===
Total links associated: 2
Total stats updated: 3

Done!
```
