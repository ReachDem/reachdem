# Solution de Rendu Email - Différence TipTap vs Preview

## Problème Identifié

Il y avait une différence de rendu entre l'éditeur TipTap et le preview HTML final. Le problème venait du fait que:

1. **TipTap génère du HTML avec des classes CSS** de maily.to (préfixées `mly:`)
2. **Ces styles CSS ne sont pas inclus** dans le HTML final généré
3. **Le package `@maily-to/render` avait un bug** avec `setTheme()` causant l'erreur "Cannot destructure property 'fontSize'"

## Solution Implémentée

### 1. Styles CSS Inline dans le HTML Final

Au lieu d'essayer d'utiliser `@maily-to/render` (qui a des problèmes avec le thème), nous avons créé une fonction `wrapContentInEmailStructure()` qui:

- Enveloppe le HTML de TipTap dans une structure email complète (DOCTYPE XHTML 1.0 Transitional)
- Injecte les styles CSS de maily.to directement dans le `<head>` avec une classe wrapper `.mly-editor-content`
- Applique les styles pour tous les éléments HTML standards (p, h1, h2, h3, a, ul, ol, li, blockquote, code, hr)
- Respecte la largeur maximale de 600px pour les emails
- Gère les images en mode `object-fit: cover`

### 2. Structure HTML Complète

Le HTML généré contient:

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "...">
<html dir="ltr" lang="en">
  <head>
    <!-- Preload links pour les images -->
    <link rel="preload" as="image" href="..." />

    <!-- Meta tags pour compatibilité email -->
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width" />

    <!-- Styles CSS avec police Google Fonts -->
    <style>
      @import url('https://fonts.googleapis.com/css2?family=...');

      /* Styles pour .mly-editor-content */
      .mly-editor-content p { ... }
      .mly-editor-content h1 { ... }
      /* etc. */
    </style>
  </head>
  <body>
    <table width="100%">
      <tr>
        <td align="center">
          <table class="container" width="600" style="max-width:600px;">
            <tr>
              <td>
                <div class="mly-editor-content">
                  <!-- Contenu TipTap ici -->
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

### 3. Application de la Police

La police sélectionnée est appliquée à trois niveaux:

1. **Dans l'éditeur TipTap** via un style dynamique injecté dans le `<head>`
2. **Dans le dropdown** via le style inline de chaque option
3. **Dans le HTML final** via `@import` de Google Fonts et application sur `.mly-editor-content`

## Fichiers Modifiés

### `apps/web/lib/render-email.ts`

- `wrapContentInEmailStructure()`: Enveloppe le HTML TipTap dans une structure email
- `generateBaseHtmlStructure()`: Génère la structure HTML de base avec styles CSS inline
- `generateFontFaceCSS()`: Génère le CSS pour importer la police Google Fonts
- `inlineMailyStyles()`: Convertit les classes maily.to en styles inline (pour future amélioration)

### `apps/web/app/api/campaigns/preview/route.ts`

- Utilise `wrapContentInEmailStructure()` pour générer le HTML final
- Accepte `htmlContent`, `fontFamily`, et `fontWeights` en paramètres

### `apps/web/components/campaigns/email-composer.tsx`

- Applique la police dans l'éditeur TipTap via un style dynamique
- Passe la police au preview dialog

### `apps/web/components/campaigns/email-preview-dialog.tsx`

- Envoie `fontFamily` et `fontWeights` à l'API de preview

## Styles CSS Inclus

Les styles suivants sont inclus dans le HTML final pour correspondre au rendu de TipTap:

- **Paragraphes**: `font-size: 15px`, `line-height: 26.25px`, `color: #374151`, `margin: 0 0 20px 0`
- **H1**: `font-size: 36px`, `line-height: 40px`, `font-weight: 800`, `color: #111827`
- **H2**: `font-size: 30px`, `line-height: 36px`, `font-weight: 700`, `color: #111827`
- **H3**: `font-size: 24px`, `line-height: 38px`, `font-weight: 600`, `color: #111827`
- **Liens**: `color: #111827`, `font-weight: 500`, `text-decoration: none`
- **Listes**: `margin: 0 0 20px 0`, `padding-left: 26px`
- **Blockquotes**: `border-left: 4px solid #D1D5DB`, `padding-left: 16px`
- **Code**: `background-color: #EFEFEF`, `color: #111827`, `padding: 2px 4px`, `border-radius: 6px`
- **HR**: `margin: 32px 0`, `border-top: 1px solid #EAEAEA`

## Améliorations Futures

1. **Utiliser `juice` pour convertir les styles CSS en inline styles** (comme maily.to le fait)
2. **Passer le JSON de TipTap à l'API** au lieu du HTML pour utiliser `@maily-to/render` correctement
3. **Extraire les styles CSS de `@maily-to/core/styles`** dynamiquement au lieu de les hardcoder
4. **Tester avec différents clients email** (Gmail, Outlook, Apple Mail, etc.)

## Résultat

Le rendu entre TipTap et le preview HTML final devrait maintenant être identique, avec:

- La même typographie et espacement
- La même police appliquée partout
- Les images en mode cover
- Une largeur maximale de 600px
- Une structure HTML complète et valide pour les emails
