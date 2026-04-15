# Système de polices et génération HTML pour emails

## 🎯 Objectif

Améliorer le compositeur d'email avec:

1. **Sélection de polices Google Fonts** - Interface pour choisir parmi 100+ polices
2. **Génération HTML standard** - HTML complet avec DOCTYPE et structure appropriée
3. **Import automatique des polices** - Les polices sont automatiquement importées dans le HTML

## ✨ Fonctionnalités

### 1. Sélecteur de polices

- 100+ polices Google Fonts disponibles
- Prévisualisation dans le dropdown
- Polices populaires en priorité
- Fallback si pas de clé API

### 2. HTML standard

- DOCTYPE XHTML 1.0 Transitional
- Structure `<html>`, `<head>`, `<body>` complète
- Meta tags pour compatibilité email
- Import automatique via `@font-face`

### 3. Compatibilité maximale

- Gmail, Outlook, Apple Mail, Yahoo
- Fallbacks de polices (Helvetica, Arial)
- Support de tous les clients majeurs

## 🚀 Démarrage rapide

### Installation

Aucune installation nécessaire - le système est déjà intégré!

### Configuration (optionnelle)

Pour accéder à toutes les polices Google Fonts, ajouter dans `.env`:

```env
GOOGLE_FONTS_API_KEY=votre_clé_api
```

Obtenir une clé: https://developers.google.com/fonts/docs/developer_api

**Sans clé API:** Le système fonctionne avec 15 polices populaires.

### Utilisation

1. **Dans l'interface:**
   - Ouvrir le compositeur d'email
   - Sélectionner une police dans le dropdown
   - Composer l'email
   - Prévisualiser

2. **Programmatiquement:**

   ```typescript
   import { renderEmail } from "@/lib/render-email";

   const html = await renderEmail({
     content: emailJson,
     fontFamily: "Montserrat",
     fontWeights: [400, 600, 700],
   });
   ```

## 📚 Documentation

### Pour commencer

- [Guide du compositeur d'email](docs/EMAIL-COMPOSER-GUIDE.md) - Guide utilisateur complet
- [Exemples d'utilisation](docs/FONT-SYSTEM-EXAMPLE.md) - Exemples de code

### Pour les développeurs

- [Documentation technique](packages/email-ui/FONT-SYSTEM.md) - Architecture et API
- [Guide de migration](docs/MIGRATION-FONT-SYSTEM.md) - Mise à jour du code existant
- [Résumé du système](docs/FONT-SYSTEM-SUMMARY.md) - Vue d'ensemble

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Email Composer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Subject    │  │ Font Selector│  │  Mode Toggle │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Visual Editor / HTML / React          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Preview System                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  POST /api/campaigns/preview                    │   │
│  │  { content, fontFamily, fontWeights }           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  HTML Generation                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  renderEmail()                                  │   │
│  │  - Add DOCTYPE                                  │   │
│  │  - Import fonts via @font-face                  │   │
│  │  - Generate complete HTML structure             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Complete HTML Email                         │
│  <!DOCTYPE html>                                         │
│  <html><head>                                            │
│    <style>@font-face { ... }</style>                     │
│  </head><body>                                           │
│    <!-- Email content -->                                │
│  </body></html>                                          │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Composants

### Nouveaux composants

- `FontSelector` - Sélecteur de polices avec dropdown
- `renderEmail()` - Fonction de rendu HTML complet
- `/api/google-fonts` - API de récupération des polices

### Composants modifiés

- `EmailComposer` - Ajout du sélecteur de police
- `EmailPreviewDialog` - Support des polices
- `/api/campaigns/preview` - Utilisation du nouveau rendu

## 📊 Exemple de HTML généré

### Avant

```html
<table>
  <tr>
    <td>
      <h1>Hello</h1>
      <p>World</p>
    </td>
  </tr>
</table>
```

### Après

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "...">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <style>
      @font-face {
        font-family: "Inter";
        font-weight: 400;
        src: url(...) format("woff2");
      }
      * {
        font-family: "Inter", Helvetica, Arial, sans-serif;
      }
    </style>
  </head>
  <body style="margin:0;">
    <table border="0" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <h1 style="font-family:'Inter',Helvetica,Arial,sans-serif;">Hello</h1>
          <p style="font-family:'Inter',Helvetica,Arial,sans-serif;">World</p>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## ✅ Tests

### Exécuter les tests

```bash
# Tests unitaires
npm test font-selector.test.tsx

# Tests d'intégration
npm test email-composer.test.tsx
```

### Tests manuels

1. Sélectionner une police
2. Composer un email
3. Prévisualiser
4. Vérifier le HTML source
5. Tester dans différents clients email

## 🎨 Polices populaires

Par défaut, ces polices sont disponibles:

- Inter (défaut)
- Roboto
- Open Sans
- Lato
- Montserrat
- Poppins
- Raleway
- Ubuntu
- Nunito
- Playfair Display
- Source Sans Pro
- Merriweather
- PT Sans
- Noto Sans
- Oswald

## 🔄 Migration

Le système est **rétrocompatible**. Le code existant continue de fonctionner sans modification.

Pour utiliser les nouvelles fonctionnalités:

```typescript
// Avant
const email = {
  subject: "Test",
  body: "<p>Hello</p>",
  mode: "html",
};

// Après (optionnel)
const email = {
  subject: "Test",
  body: "<p>Hello</p>",
  mode: "html",
  fontFamily: "Montserrat", // Nouveau
  fontWeights: [400, 700], // Nouveau
};
```

Voir [Guide de migration](docs/MIGRATION-FONT-SYSTEM.md) pour plus de détails.

## 🐛 Dépannage

### La police ne s'affiche pas

- Vérifier que la police est sélectionnée
- Certains clients bloquent les polices web
- Les fallbacks sont toujours appliqués

### Erreur API Google Fonts

- Vérifier la clé API dans `.env`
- Le système fonctionne sans clé (polices limitées)
- Vérifier les quotas de l'API

### HTML cassé

- Utiliser le formatage automatique (Shift+Alt+F)
- Vérifier la structure dans la prévisualisation
- Consulter les logs de la console

## 📈 Performance

- **Cache:** Polices cachées 24h côté serveur
- **Format:** WOFF2 (meilleure compression)
- **CDN:** Google Fonts CDN (rapide et fiable)
- **Fallbacks:** Chargement immédiat des polices système

## 🤝 Contribution

Pour contribuer:

1. Lire la documentation technique
2. Suivre les conventions de code
3. Ajouter des tests
4. Mettre à jour la documentation

## 📝 Licence

Voir le fichier LICENSE du projet principal.

## 🔗 Liens utiles

- [Google Fonts](https://fonts.google.com)
- [Google Fonts API](https://developers.google.com/fonts/docs/developer_api)
- [Maily.to](https://maily.to)
- [React Email](https://react.email)
- [Email HTML Best Practices](https://www.campaignmonitor.com/css/)

## 📞 Support

Pour toute question:

1. Consulter la documentation
2. Vérifier les exemples
3. Ouvrir une issue sur GitHub

---

**Status:** ✅ Production Ready

**Version:** 1.0.0

**Dernière mise à jour:** 2024
