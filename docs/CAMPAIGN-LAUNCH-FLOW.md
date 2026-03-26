# Flux de Lancement de Campagne

## Vue d'ensemble

Le système de lancement de campagne est maintenant complètement fonctionnel avec une gestion complète des erreurs, des logs détaillés et des toasts informatifs.

## Flux Complet

### 1. Save Draft (Sauvegarder comme brouillon)

**Étapes**:

1. Validation du titre de campagne
2. Création de la campagne avec statut "draft"
3. Redirection vers la liste des campagnes

**API Calls**:

```
POST /api/v1/campaigns
```

**Payload**:

```json
{
  "name": "Campaign Title",
  "description": "Optional description",
  "channel": "email" | "sms",
  "content": {
    // For email:
    "subject": "Email subject",
    "html": "<p>Email content</p>"
    // For SMS:
    "text": "SMS message"
  }
}
```

**Logs Console**:

- `[Campaign] Starting save draft...`
- `[Campaign] Type: email/sms`
- `[Campaign] Title: ...`
- `[Campaign] Saving draft with payload: {...}`
- `[Campaign] Draft saved successfully: {...}`
- `[Campaign] Draft save completed`

### 2. Launch (Lancer immédiatement)

**Étapes**:

1. Validation du contenu (sujet, corps pour email / texte pour SMS)
2. Validation de l'audience (segment OU groupe requis)
3. Création de la campagne
4. Définition de l'audience
5. Lancement de la campagne
6. Redirection vers la liste des campagnes

**API Calls**:

```
1. POST /api/v1/campaigns
2. POST /api/v1/campaigns/{id}/audience
3. POST /api/v1/campaigns/{id}/launch
```

**Payload Campagne**:

```json
{
  "name": "Campaign Title",
  "description": "Optional description",
  "channel": "email" | "sms",
  "content": {
    "subject": "Email subject",
    "html": "<p>Email content</p>"
  }
}
```

**Payload Audience**:

```json
{
  "audiences": [
    {
      "sourceType": "segment" | "group",
      "sourceId": "seg-123" | "grp-123"
    }
  ]
}
```

**Logs Console**:

- `[Campaign] Starting launch...`
- `[Campaign] Type: email/sms`
- `[Campaign] Email Subject: ...` / `[Campaign] SMS Text: ...`
- `[Campaign] Selected Segment: ...` / `[Campaign] Selected Group: ...`
- `[Campaign] Creating campaign with payload: {...}`
- `[Campaign] Created successfully: {...}`
- `[Campaign] Setting audience with payload: {...}`
- `[Campaign] Audience set successfully: {...}`
- `[Campaign] Launching campaign: campaign-id`
- `[Campaign] Launched successfully: {...}`
- `[Campaign] Launch completed`

### 3. Schedule (Planifier)

**Étapes**:

1. Validation de la date et heure
2. Validation du contenu
3. Validation de l'audience
4. Création de la campagne avec `scheduledAt`
5. Définition de l'audience
6. Redirection vers la liste des campagnes

**API Calls**:

```
1. POST /api/v1/campaigns (with scheduledAt)
2. POST /api/v1/campaigns/{id}/audience
```

**Payload Campagne**:

```json
{
  "name": "Campaign Title",
  "description": "Optional description",
  "channel": "email" | "sms",
  "content": {...},
  "scheduledAt": "2024-12-25T09:00:00.000Z"
}
```

**Logs Console**:

- `[Campaign] Starting schedule...`
- `[Campaign] Scheduled Date: ...`
- `[Campaign] Scheduled Time: ...`
- `[Campaign] Scheduled DateTime: ...`
- `[Campaign] Creating scheduled campaign with payload: {...}`
- `[Campaign] Created successfully: {...}`
- `[Campaign] Setting audience with payload: {...}`
- `[Campaign] Audience set successfully: {...}`
- `[Campaign] Schedule completed`

## Validations

### Email

- ✅ Sujet requis (non vide)
- ✅ Corps requis (non vide)
- ✅ Sujet max 200 caractères
- ✅ HTML max 200,000 caractères

### SMS

- ✅ Texte requis (non vide)
- ✅ Texte max 1600 caractères

### Audience

- ✅ Segment OU Groupe requis (pas les deux, pas aucun)

### Général

- ✅ Titre de campagne requis
- ✅ Titre max 100 caractères
- ✅ Description max 500 caractères

## Gestion des Erreurs

### Toasts Utilisateur

Tous les cas d'erreur affichent un toast avec un message clair:

- ❌ "Campaign title is required"
- ❌ "Please enter an email subject"
- ❌ "Please enter email content"
- ❌ "Please enter SMS message"
- ❌ "SMS message exceeds 1600 character limit"
- ❌ "Please select a target audience (segment or group)"
- ❌ "Please choose a schedule date"
- ❌ "Failed to create campaign: [error details]"
- ❌ "Failed to set audience: [error details]"
- ❌ "Failed to launch campaign: [error details]"
- ✅ "Draft saved successfully"
- ✅ "Campaign launched successfully"
- ✅ "Campaign scheduled for [date] at [time]"

### Logs Console

Tous les logs sont préfixés par `[Campaign]` pour faciliter le filtrage:

- Logs d'information: actions en cours
- Logs d'erreur: `console.error()` avec détails complets
- Stack traces pour les erreurs inattendues

### Try/Catch

Toutes les fonctions async ont des blocs try/catch complets:

```typescript
try {
  // API calls
} catch (error) {
  console.error("[Campaign] Error:", error);
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error occurred";
  toast.error(`Failed: ${errorMessage}`);
} finally {
  setIsLoading(false);
}
```

## Debug

### Ouvrir la Console

1. F12 ou Ctrl+Shift+I
2. Onglet "Console"
3. Filtrer par `[Campaign]`

### Vérifier les Requêtes

1. Onglet "Network"
2. Filtrer par "Fetch/XHR"
3. Cliquer sur une requête pour voir:
   - Headers
   - Payload
   - Response
   - Status code

### Logs Disponibles

- État initial (type, titre, audience sélectionnée)
- Validation (erreurs de validation)
- Payloads envoyés aux APIs
- Réponses des APIs
- Erreurs complètes avec stack traces

## Exemple de Flux Complet (Launch)

```
[Campaign] Starting launch...
[Campaign] Type: email
[Campaign] Title: Welcome Email
[Campaign] Selected Segment: seg-123
[Campaign] Selected Group:
[Campaign] Email Subject: Welcome to our platform!
[Campaign] Email Body Length: 1234
[Campaign] Creating campaign with payload: {
  name: "Welcome Email",
  channel: "email",
  content: { subject: "...", html: "..." }
}
[Campaign] Created successfully: { id: "camp-456", ... }
[Campaign] Setting audience with payload: {
  audiences: [{ sourceType: "segment", sourceId: "seg-123" }]
}
[Campaign] Audience set successfully: [{ id: "aud-789", ... }]
[Campaign] Launching campaign: camp-456
[Campaign] Launched successfully: { message: "Campaign launch queued successfully" }
[Campaign] Launch completed
```

## Prochaines Étapes

1. ✅ Validation complète
2. ✅ Gestion des erreurs
3. ✅ Logs détaillés
4. ✅ Toasts informatifs
5. ✅ Intégration API complète
6. ⏳ Tests end-to-end
7. ⏳ Gestion des erreurs réseau (retry, timeout)
8. ⏳ Confirmation avant lancement
9. ⏳ Aperçu de l'audience (nombre de contacts)
