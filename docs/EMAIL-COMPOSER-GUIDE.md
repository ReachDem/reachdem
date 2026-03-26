# Email Composer Guide

## Vue d'ensemble

Le compositeur d'email de ReachDem offre un système complet pour créer des emails professionnels avec:

- Éditeur visuel riche (basé sur maily.to)
- Sélection de polices Google Fonts
- Génération HTML standard avec DOCTYPE
- Prévisualisation en temps réel
- Support de templates personnalisés

## Fonctionnalités principales

### 1. Sélection de police

Le compositeur inclut un sélecteur de polices Google Fonts qui permet de:

- Choisir parmi 100+ polices Google Fonts
- Prévisualiser les polices dans le sélecteur
- Appliquer automatiquement la police à tout l'email

**Configuration (optionnelle):**

```env
GOOGLE_FONTS_API_KEY=votre_clé_api
```

Sans clé API, le système utilise une liste de polices populaires par défaut.

### 2. Modes d'édition

Le compositeur offre 3 modes:

#### Mode Visuel (Rich Text)

- Éditeur WYSIWYG complet
- Blocs pré-construits (headers, footers, marketing, pricing)
- Glisser-déposer pour organiser le contenu
- Commande slash (/) pour insérer des blocs

#### Mode HTML

- Éditeur de code avec coloration syntaxique
- Formatage automatique (Shift+Alt+F)
- Validation HTML en temps réel

#### Mode React (BETA)

- Templates React Email
- Support TypeScript/JSX
- Composants réutilisables

### 3. Génération HTML

Le système génère du HTML standard conforme aux normes:

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "...">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />

    <!-- Import des polices -->
    <style>
      @font-face {
        font-family: "Inter";
        font-style: normal;
        font-weight: 400;
        src: url(...) format("woff2");
      }
    </style>
  </head>
  <body>
    <!-- Contenu de l'email -->
  </body>
</html>
```

### 4. Blocs disponibles

#### Blocs de base

- Texte et paragraphes
- Titres (H1, H2, H3)
- Listes (ordonnées et non ordonnées)
- Images
- Boutons
- Liens
- Séparateurs
- Espaceurs

#### Composants Headers

- Simple Header
- Logo + Navigation
- Centered Logo

#### Composants Footers

- Simple Footer
- Social Links Footer
- Multi-column Footer

#### Composants Marketing

- Cart Abandonment (panier abandonné)
- Single Product (produit unique)
- Product Showcase (vitrine de produits)

#### Composants Pricing

- Single Plan (plan unique)
- Comparison Pricing (comparaison de plans)

### 5. Prévisualisation

Le système de prévisualisation offre:

- Aperçu en temps réel
- Simulation de l'apparence dans la boîte de réception
- Ouverture dans un nouvel onglet
- Application correcte des polices

## Utilisation

### Créer un nouvel email

1. **Choisir le type de campagne**
   - Aller sur `/campaigns/new`
   - Sélectionner Email ou SMS
   - Cliquer sur "Continuer"

2. **Composer l'email**
   - Entrer le sujet (max 200 caractères)
   - Sélectionner une police (optionnel, défaut: Inter)
   - Choisir le mode d'édition

3. **Ajouter du contenu**
   - Mode Visuel: Utiliser `/` pour insérer des blocs
   - Mode HTML: Écrire le HTML directement
   - Mode React: Créer des composants React Email

4. **Prévisualiser**
   - Cliquer sur "Preview"
   - Vérifier l'apparence
   - Ouvrir dans un nouvel onglet si nécessaire

### Utiliser les blocs marketing

#### Cart Abandonment (Panier abandonné)

```
1. Taper "/" dans l'éditeur
2. Chercher "Cart Abandonment"
3. Le bloc contient:
   - Tableau de produits
   - Images, descriptions, prix
   - Bouton "Checkout"
```

#### Product Showcase (Vitrine)

```
1. Taper "/" dans l'éditeur
2. Chercher "Product Showcase"
3. Le bloc contient:
   - Section hero avec fond sombre
   - Grille de produits
   - Descriptions et CTAs
```

#### Single Product (Produit unique)

```
1. Taper "/" dans l'éditeur
2. Chercher "Single Product"
3. Le bloc contient:
   - Image hero centrée
   - Catégorie et titre
   - Description
   - Bouton CTA
```

### Utiliser les blocs pricing

#### Single Plan

```
1. Taper "/" dans l'éditeur
2. Chercher "Single Plan"
3. Le bloc contient:
   - Badge (Popular, etc.)
   - Prix et période
   - Liste de fonctionnalités
   - Bouton CTA
```

#### Comparison Pricing

```
1. Taper "/" dans l'éditeur
2. Chercher "Comparison Pricing"
3. Le bloc contient:
   - 2 colonnes (Hobby vs Enterprise)
   - Prix comparatifs
   - Listes de fonctionnalités
   - Boutons CTA
```

## Personnalisation

### Modifier les couleurs

Dans l'éditeur visuel:

1. Sélectionner le texte ou le bloc
2. Utiliser la barre d'outils pour changer les couleurs
3. Les couleurs sont appliquées inline dans le HTML

### Modifier les espacements

Utiliser les blocs "Spacer":

1. Taper "/" puis "Spacer"
2. Ajuster la hauteur dans les propriétés
3. Placer entre les sections pour l'espacement

### Ajouter des images

1. Taper "/" puis "Image"
2. Entrer l'URL de l'image
3. Ajuster la taille et l'alignement
4. Optionnel: Ajouter un lien externe

## Bonnes pratiques

### Structure d'email

```
1. Header (logo + navigation)
2. Hero section (titre + CTA principal)
3. Contenu principal (produits, features, etc.)
4. CTA secondaire
5. Footer (liens, réseaux sociaux, désinscription)
```

### Polices

- **Sans-serif recommandées:** Inter, Roboto, Open Sans
- **Serif pour titres:** Playfair Display, Merriweather
- **Éviter:** Polices trop décoratives ou difficiles à lire

### Images

- Utiliser des URLs absolues (https://)
- Optimiser la taille (max 600px de largeur)
- Toujours inclure un texte alternatif (alt)
- Héberger sur un CDN rapide

### Boutons

- Texte court et actionnable ("Acheter maintenant", "En savoir plus")
- Couleurs contrastées
- Taille suffisante pour mobile (min 44x44px)

### Responsive

- Le système génère automatiquement du HTML responsive
- Les colonnes s'empilent sur mobile
- Les images s'adaptent à la largeur

## Compatibilité

Le HTML généré est compatible avec:

- Gmail (web, iOS, Android)
- Outlook (2007-2021, 365, web)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Thunderbird
- Autres clients majeurs

## Dépannage

### La police ne s'affiche pas

- Vérifier que la police est bien sélectionnée
- Certains clients email bloquent les polices web
- Les polices fallback (Helvetica, Arial) sont toujours appliquées

### Les images ne s'affichent pas

- Vérifier que les URLs sont absolues (https://)
- Vérifier que les images sont accessibles publiquement
- Certains clients bloquent les images par défaut

### Le HTML est cassé

- Utiliser le mode HTML et formater (Shift+Alt+F)
- Vérifier que toutes les balises sont fermées
- Utiliser la prévisualisation pour détecter les erreurs

### L'éditeur est lent

- Réduire le nombre de blocs complexes
- Optimiser les images (taille et format)
- Vider le cache du navigateur

## API

### Render Email

```typescript
import { renderEmail } from "@/lib/render-email";

const html = await renderEmail({
  content: jsonContent,
  previewText: "Texte de prévisualisation",
  fontFamily: "Inter",
  fontWeights: [400, 600, 700],
});
```

### Preview API

```typescript
POST /api/campaigns/preview
Content-Type: application/json

{
  "content": "{...}", // JSON TipTap
  "previewText": "Texte de prévisualisation",
  "fontFamily": "Inter",
  "fontWeights": [400, 600, 700]
}
```

### Google Fonts API

```typescript
GET /api/google-fonts

Response:
{
  "fonts": [
    {
      "family": "Inter",
      "variants": ["400", "600", "700"],
      "category": "sans-serif"
    },
    ...
  ]
}
```

## Ressources

- [Maily.to Documentation](https://maily.to/docs)
- [React Email](https://react.email)
- [Google Fonts](https://fonts.google.com)
- [Email HTML Best Practices](https://www.campaignmonitor.com/css/)
