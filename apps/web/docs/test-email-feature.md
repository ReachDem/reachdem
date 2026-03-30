# Fonctionnalité d'Email de Test

## Vue d'ensemble

Cette fonctionnalité permet aux utilisateurs d'envoyer un email de test à leur propre adresse email avant d'envoyer une campagne à plusieurs destinataires. Cela leur permet de prévisualiser le rendu final de l'email dans leur boîte de réception.

## Composants modifiés

### 1. EmailComposer (`apps/web/components/campaigns/email-composer.tsx`)

Ajout d'un bouton "Test" dans l'interface du composer d'email :

- **Position** : À côté du bouton "Preview" et du sélecteur de police
- **Champ Sender Name** : Permet de personnaliser le nom de l'expéditeur (par défaut: "ReachDem Notifications")
- **Comportement** :
  - Désactivé si le sujet ou le contenu est vide
  - Affiche un loader pendant l'envoi
  - Affiche une notification de succès ou d'erreur via Sonner

### 2. Route API de Test (`apps/web/app/api/v1/campaigns/test/route.ts`)

Nouvelle route API pour gérer l'envoi d'emails de test :

- **Endpoint** : `POST /api/v1/campaigns/test`
- **Authentification** : Requiert une session utilisateur valide avec workspace actif
- **Fonctionnalités** :
  - Récupère l'email de l'utilisateur connecté depuis la session
  - Valide les données d'entrée (sujet, contenu HTML, sender name optionnel)
  - Enveloppe le contenu dans une structure HTML complète avec styles
  - Ajoute le préfixe `[TEST]` au sujet pour identifier facilement les emails de test
  - **Utilise le même système d'envoi que les campagnes réelles** :
    - Crée un message dans la base de données via `EnqueueEmailUseCase`
    - Publie le job dans la queue Cloudflare Worker
    - Utilise Alibaba Direct Mail pour l'envoi effectif

## Flux de fonctionnement

```
1. Utilisateur remplit le composer (sender name, sujet, contenu)
   ↓
2. Utilisateur clique sur "Test"
   ↓
3. Validation côté client (sujet + contenu requis)
   ↓
4. Requête POST vers /api/v1/campaigns/test
   ↓
5. Récupération de l'email utilisateur et organizationId depuis la session
   ↓
6. Wrapping du contenu HTML avec styles et structure
   ↓
7. Création d'un message dans la base de données (status: queued)
   ↓
8. Publication du job dans EMAIL_QUEUE (Cloudflare Worker)
   ↓
9. Worker traite le job et envoie via Alibaba Direct Mail
   ↓
10. Notification de succès à l'utilisateur (message queued)
```

## Schéma de validation

```typescript
{
  subject: string (min 1 caractère),
  htmlContent: string (min 1 caractère),
  fontFamily?: string (optionnel, défaut: "Inter"),
  fontWeights?: number[] (optionnel, défaut: [400, 600, 700]),
  fromName?: string (optionnel, défaut: "ReachDem Notifications")
}
```

## Réponse API

### Succès (200)

```json
{
  "success": true,
  "message": "Test email sent to user@example.com",
  "messageId": "msg_123456",
  "status": "queued",
  "correlationId": "uuid-correlation-id"
}
```

### Erreurs

- **401 Unauthorized** : Utilisateur non authentifié
- **403 Forbidden** : Workspace non sélectionné
- **400 Bad Request** : Email utilisateur non trouvé ou données invalides
- **500 Internal Server Error** : Erreur lors de la création du message ou publication

## Dépendances

- **Sonner** : Pour les notifications toast
- **Better Auth** : Pour la gestion de session et récupération de l'email utilisateur
- **EnqueueEmailUseCase** : Pour créer le message et le mettre en queue
- **publishEmailJob** : Pour publier le job dans le worker Cloudflare
- **Alibaba Direct Mail** : Pour l'envoi effectif des emails (via worker)
- **wrapContentInEmailStructure** : Pour formater le HTML avec styles

## Configuration requise

Les variables d'environnement suivantes doivent être configurées :

### Application Web

```env
# Worker URL
EMAIL_WORKER_BASE_URL=http://127.0.0.1:8787
# ou
CLOUDFLARE_WORKER_BASE_URL=http://127.0.0.1:8787

# Sender par défaut
SENDER_NAME=ReachDem Notifications
```

### Cloudflare Worker

```env
# Alibaba Direct Mail
ALIBABA_ACCESS_KEY_ID=your-access-key
ALIBABA_ACCESS_KEY_SECRET=your-secret-key
ALIBABA_REGION=eu-central-1
ALIBABA_SENDER_EMAIL=noreply@example.com
ALIBABA_SENDER_NAME=ReachDem Notifications

# Database
DATABASE_URL=postgresql://...
# ou
PRISMA_ACCELERATE_URL=prisma://...
```

## Utilisation

1. Ouvrir le composer d'email dans une campagne
2. (Optionnel) Personnaliser le nom de l'expéditeur
3. Remplir le sujet et le contenu de l'email
4. Cliquer sur le bouton "Test" (icône Send)
5. Vérifier la notification de succès (email mis en queue)
6. Consulter sa boîte email pour voir le rendu (délai: quelques secondes)

## Avantages de l'approche actuelle

- **Cohérence** : Utilise exactement le même système que les campagnes réelles
- **Fiabilité** : Bénéficie de la même gestion d'erreurs et retry logic
- **Traçabilité** : Les emails de test sont enregistrés dans la base de données
- **Monitoring** : Possibilité de suivre le statut du message de test
- **Scalabilité** : Utilise la même infrastructure de queue que la production

## Améliorations futures possibles

- Permettre d'envoyer à plusieurs adresses de test
- Ajouter un historique des emails de test envoyés dans l'interface
- Permettre de choisir différents clients email pour tester le rendu
- Ajouter des statistiques sur les emails de test (taux d'ouverture, etc.)
- Permettre de sauvegarder des templates de test
