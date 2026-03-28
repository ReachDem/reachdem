# Améliorations possibles pour @reachdem/email-ui

Maintenant que nous avons copié l'intégralité du package maily.to, voici les améliorations que nous pouvons implémenter:

## 1. Upload d'images 📸

**Fichiers disponibles:**

- `src/core/editor/extensions/image-upload/image-upload.ts`
- `src/core/editor/plugins/image-upload/image-upload-plugin.ts`

**Ce qu'on peut faire:**

- Intégrer avec AWS S3 (déjà configuré dans le projet)
- Drag & drop d'images directement dans l'éditeur
- Upload via URL ou fichier local
- Redimensionnement automatique
- Optimisation des images

**Implémentation:**

```typescript
import { ImageUpload } from '@reachdem/email-ui';

// Dans EmailComposer, ajouter l'extension:
extensions={[
  ImageUpload.configure({
    onUpload: async (file) => {
      // Upload vers S3
      const url = await uploadToS3(file);
      return url;
    },
  }),
]}
```

## 2. Système de variables 🔤

**Fichiers disponibles:**

- `src/core/editor/nodes/variable/variable.ts`
- `src/core/editor/nodes/variable/variable-suggestions.tsx`
- `src/core/editor/utils/variable.ts`

**Ce qu'on peut faire:**

- Variables personnalisées: `{{firstName}}`, `{{email}}`, `{{companyName}}`
- Auto-complétion des variables
- Preview avec données de test
- Validation des variables

**Variables utiles pour ReachDem:**

- Informations contact: `{{firstName}}`, `{{lastName}}`, `{{email}}`, `{{phone}}`
- Informations organisation: `{{organizationName}}`, `{{website}}`
- Campagne: `{{campaignName}}`, `{{unsubscribeLink}}`

## 3. Rendu HTML optimisé 📧

**Fichiers disponibles:**

- `src/core/editor/utils/get-render-container.ts`
- `src/core/editor/nodes/html/html.tsx`

**Ce qu'on peut faire:**

- Export HTML compatible avec tous les clients email
- Inline CSS automatique
- Support des clients email legacy (Outlook, Gmail, etc.)
- Preview multi-clients

**Intégration avec @maily-to/render:**

```typescript
import { render } from "@maily-to/render";

const html = await render(editorContent, {
  inlineCss: true,
  minify: true,
});
```

## 4. Menus contextuels améliorés 🎨

**Fichiers disponibles:**

- `src/core/editor/components/image-menu/` - Menu pour images
- `src/core/editor/components/text-menu/` - Menu pour texte
- `src/core/editor/components/section-menu/` - Menu pour sections
- `src/core/editor/components/column-menu/` - Menu pour colonnes

**Ce qu'on peut faire:**

- Personnaliser les menus pour ReachDem
- Ajouter des options spécifiques (tracking, analytics)
- Raccourcis clavier personnalisés
- Templates rapides

## 5. Extensions personnalisées 🔧

**Fichiers disponibles:**

- `src/core/editor/extensions/color.ts` - Gestion des couleurs
- `src/core/editor/extensions/placeholder.ts` - Placeholders
- `src/core/editor/extensions/maily-kit.tsx` - Kit d'extensions

**Extensions à créer:**

- **Tracking Links**: Ajouter automatiquement des paramètres UTM
- **A/B Testing**: Marquer des sections pour tests A/B
- **Conditional Content**: Afficher du contenu selon des conditions
- **Dynamic Content**: Contenu qui change selon le destinataire

## 6. Typographie et styles 🎨

**Fichiers disponibles:**

- `src/core/blocks/typography.tsx`
- `src/core/editor/utils/spacing.ts`
- `src/core/editor/utils/border-radius.ts`

**Ce qu'on peut faire:**

- Palette de couleurs ReachDem
- Styles de marque prédéfinis
- Thèmes d'email (Corporate, Marketing, Newsletter)
- Espacement cohérent

## 7. Drag & Drop avancé 🎯

**Fichiers disponibles:**

- `src/core/editor/plugins/drag-handle/`

**Ce qu'on peut faire:**

- Réorganiser les sections par drag & drop
- Dupliquer des blocs facilement
- Copier/coller entre emails
- Bibliothèque de blocs réutilisables

## 8. Preview et tests 👁️

**Ce qu'on peut ajouter:**

- Preview desktop/mobile/tablet
- Test sur différents clients email
- Mode sombre/clair
- Test des liens et images
- Validation HTML/CSS

## 9. Intégration avec le backend 🔗

**Ce qu'on peut faire:**

- Sauvegarder automatiquement (auto-save)
- Historique des versions
- Collaboration en temps réel
- Templates partagés dans l'organisation

## 10. Analytics et tracking 📊

**Ce qu'on peut ajouter:**

- Tracking des clics automatique
- Heatmaps des emails
- Statistiques d'engagement
- Paramètres UTM automatiques

## Priorités recommandées

### Phase 1 (Immédiat)

1. ✅ Upload d'images vers S3
2. ✅ Variables de base (firstName, email, etc.)
3. ✅ Rendu HTML optimisé

### Phase 2 (Court terme)

4. Menus contextuels personnalisés
5. Palette de couleurs ReachDem
6. Preview multi-devices

### Phase 3 (Moyen terme)

7. Tracking links automatique
8. A/B testing markers
9. Auto-save et versions

### Phase 4 (Long terme)

10. Collaboration temps réel
11. Analytics avancés
12. Templates marketplace

## Exemples de code

### Upload d'images vers S3

```typescript
// apps/web/lib/upload-image.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function uploadImageToS3(file: File): Promise<string> {
  const s3 = new S3Client({ region: process.env.AWS_REGION });

  const key = `campaigns/images/${Date.now()}-${file.name}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    })
  );

  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
}
```

### Configuration des variables

```typescript
// Dans EmailComposer
const variableOptions = [
  { label: "First Name", value: "{{firstName}}" },
  { label: "Last Name", value: "{{lastName}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Phone", value: "{{phone}}" },
  { label: "Organization", value: "{{organizationName}}" },
  { label: "Unsubscribe Link", value: "{{unsubscribeLink}}" },
];
```

### Rendu HTML pour envoi

```typescript
import { render } from "@maily-to/render";

async function sendCampaign(campaignId: string) {
  const campaign = await getCampaign(campaignId);

  // Rendu HTML optimisé
  const html = await render(campaign.content, {
    inlineCss: true,
    minify: true,
  });

  // Envoi via AWS SES
  await sendEmail({
    to: recipients,
    subject: campaign.subject,
    html,
  });
}
```

## Ressources

- [Maily.to Documentation](https://maily.to/docs)
- [TipTap Documentation](https://tiptap.dev)
- [React Email](https://react.email)
- [Email Client Support](https://www.caniemail.com)
