# Migration vers le nouveau système de polices

## Vue d'ensemble

Le système de compositeur d'email a été amélioré avec:

1. **Sélecteur de polices Google Fonts** - Permet de choisir parmi 100+ polices
2. **Génération HTML standard** - HTML complet avec DOCTYPE et structure appropriée
3. **Import automatique des polices** - Les polices sont automatiquement importées dans le HTML généré

## Changements apportés

### Nouveaux fichiers

```
apps/web/
├── components/campaigns/
│   ├── font-selector.tsx              # Nouveau composant de sélection de police
│   └── font-selector.test.tsx         # Tests du sélecteur
├── app/api/
│   └── google-fonts/
│       └── route.ts                   # Nouvelle API pour récupérer les polices
└── lib/
    └── render-email.ts                # Nouvelles fonctions de rendu HTML

packages/email-ui/
├── FONT-SYSTEM.md                     # Documentation du système de polices
└── IMPROVEMENTS.md                    # (existant, mis à jour)

docs/
├── EMAIL-COMPOSER-GUIDE.md            # Guide complet du compositeur
├── FONT-SYSTEM-EXAMPLE.md             # Exemples d'utilisation
└── MIGRATION-FONT-SYSTEM.md           # Ce fichier
```

### Fichiers modifiés

```
apps/web/
├── components/campaigns/
│   ├── email-composer.tsx             # Ajout du sélecteur de police
│   └── email-preview-dialog.tsx       # Support des polices dans la prévisualisation
└── app/api/campaigns/preview/
    └── route.ts                       # Utilisation du nouveau système de rendu

.env.example                           # Ajout de GOOGLE_FONTS_API_KEY
```

## Changements dans l'interface

### EmailContent (Breaking Change)

```typescript
// AVANT
export interface EmailContent {
  subject: string;
  body: string;
  bodyJson?: any;
  mode: EmailMode;
}

// APRÈS
export interface EmailContent {
  subject: string;
  body: string;
  bodyJson?: any;
  mode: EmailMode;
  fontFamily?: string; // NOUVEAU
  fontWeights?: number[]; // NOUVEAU
}
```

### EmailComposer Props (Non-breaking)

Les props du composant `EmailComposer` n'ont pas changé, mais le composant affiche maintenant un sélecteur de police.

```typescript
// Utilisation identique
<EmailComposer
  value={emailContent}
  onChange={setEmailContent}
  disabled={false}
/>
```

### EmailPreviewDialog Props (Non-breaking)

Nouvelles props optionnelles ajoutées:

```typescript
// AVANT
<EmailPreviewDialog
  subject={subject}
  htmlContent={html}
  disabled={false}
/>

// APRÈS (rétrocompatible)
<EmailPreviewDialog
  subject={subject}
  htmlContent={html}
  disabled={false}
  fontFamily="Inter"        // NOUVEAU (optionnel)
  fontWeights={[400, 700]}  // NOUVEAU (optionnel)
/>
```

## Guide de migration

### Étape 1: Mettre à jour les types

Si vous utilisez `EmailContent` dans votre code:

```typescript
// Avant
const emailContent: EmailContent = {
  subject: "Test",
  body: "<p>Hello</p>",
  mode: "html",
};

// Après (rétrocompatible)
const emailContent: EmailContent = {
  subject: "Test",
  body: "<p>Hello</p>",
  mode: "html",
  fontFamily: "Inter", // Optionnel
  fontWeights: [400, 700], // Optionnel
};
```

### Étape 2: Configurer l'API Google Fonts (optionnel)

Ajouter dans `.env`:

```env
GOOGLE_FONTS_API_KEY=votre_clé_api
```

Sans cette clé, le système fonctionne avec une liste de polices populaires.

### Étape 3: Mettre à jour les appels de rendu

Si vous utilisez directement `render` de `@maily-to/render`:

```typescript
// Avant
import { render } from "@maily-to/render";

const html = await render(content, {
  previewText: "Preview",
});

// Après (recommandé)
import { renderEmail } from "@/lib/render-email";

const html = await renderEmail({
  content,
  previewText: "Preview",
  fontFamily: "Inter",
  fontWeights: [400, 600, 700],
});
```

### Étape 4: Mettre à jour les appels API de prévisualisation

Si vous appelez directement l'API de prévisualisation:

```typescript
// Avant
const response = await fetch("/api/campaigns/preview", {
  method: "POST",
  body: JSON.stringify({
    content: JSON.stringify(contentJson),
    previewText: "Preview",
  }),
});

// Après (rétrocompatible)
const response = await fetch("/api/campaigns/preview", {
  method: "POST",
  body: JSON.stringify({
    content: JSON.stringify(contentJson),
    previewText: "Preview",
    fontFamily: "Inter", // Nouveau (optionnel)
    fontWeights: [400, 700], // Nouveau (optionnel)
  }),
});
```

## Compatibilité

### Rétrocompatibilité

✅ **Le code existant continue de fonctionner sans modification**

- Les nouveaux champs sont optionnels
- Les valeurs par défaut sont appliquées automatiquement
- L'API accepte les anciennes et nouvelles structures

### Valeurs par défaut

Si les nouveaux champs ne sont pas fournis:

- `fontFamily`: `'Inter'`
- `fontWeights`: `[400, 600, 700]`

### Comportement sans clé API

Sans `GOOGLE_FONTS_API_KEY`:

- Le sélecteur affiche 15 polices populaires
- Les polices sont toujours importées correctement
- Aucune fonctionnalité n'est perdue

## Tests

### Tester le sélecteur de police

```typescript
import { render, screen } from '@testing-library/react';
import { FontSelector } from '@/components/campaigns/font-selector';

test('renders font selector', () => {
  render(<FontSelector value="Inter" onChange={() => {}} />);
  expect(screen.getByText('Font Family')).toBeInTheDocument();
});
```

### Tester le rendu HTML

```typescript
import { renderEmail } from "@/lib/render-email";

test("renders email with custom font", async () => {
  const html = await renderEmail({
    content: { type: "doc", content: [] },
    fontFamily: "Montserrat",
  });

  expect(html).toContain("font-family: 'Montserrat'");
  expect(html).toContain("<!DOCTYPE html");
});
```

## Rollback

Si vous devez revenir à l'ancienne version:

1. **Supprimer les nouveaux fichiers:**

   ```bash
   rm apps/web/components/campaigns/font-selector.tsx
   rm apps/web/components/campaigns/font-selector.test.tsx
   rm apps/web/app/api/google-fonts/route.ts
   rm apps/web/lib/render-email.ts
   ```

2. **Restaurer les fichiers modifiés depuis Git:**

   ```bash
   git checkout HEAD -- apps/web/components/campaigns/email-composer.tsx
   git checkout HEAD -- apps/web/components/campaigns/email-preview-dialog.tsx
   git checkout HEAD -- apps/web/app/api/campaigns/preview/route.ts
   ```

3. **Supprimer la variable d'environnement:**
   ```bash
   # Retirer de .env
   GOOGLE_FONTS_API_KEY=...
   ```

## FAQ

### Q: Dois-je mettre à jour mon code existant?

**R:** Non, le code existant continue de fonctionner. Les mises à jour sont optionnelles.

### Q: Que se passe-t-il si je n'ai pas de clé API Google Fonts?

**R:** Le système fonctionne avec une liste de polices populaires. Aucune fonctionnalité n'est perdue.

### Q: Les emails existants seront-ils affectés?

**R:** Non, les emails existants continuent d'utiliser leur police actuelle (probablement Inter par défaut).

### Q: Comment changer la police par défaut?

**R:** Modifier la valeur par défaut dans `email-composer.tsx`:

```typescript
fontFamily: value.fontFamily || "Votre Police";
```

### Q: Les polices fonctionnent-elles dans tous les clients email?

**R:** La plupart des clients modernes supportent les polices web. Les fallbacks (Helvetica, Arial) garantissent la lisibilité partout.

### Q: Puis-je utiliser des polices personnalisées (non-Google)?

**R:** Actuellement, seules les Google Fonts sont supportées. Le support de polices personnalisées pourrait être ajouté dans une future version.

### Q: Comment tester le rendu dans différents clients email?

**R:** Utilisez des services comme Litmus ou Email on Acid pour tester le rendu dans différents clients.

## Support

Pour toute question ou problème:

1. Consulter la documentation: `docs/EMAIL-COMPOSER-GUIDE.md`
2. Voir les exemples: `docs/FONT-SYSTEM-EXAMPLE.md`
3. Lire la doc technique: `packages/email-ui/FONT-SYSTEM.md`
4. Ouvrir une issue sur GitHub

## Prochaines étapes

Améliorations futures possibles:

- [ ] Sélecteur de poids de police
- [ ] Prévisualisation de la police dans l'éditeur
- [ ] Support de polices personnalisées
- [ ] Suggestions de pairings de polices
- [ ] Presets de polices par industrie
