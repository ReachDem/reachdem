# Alibaba Cloud Email Test

Ce projet permet de tester l'API Alibaba Cloud Direct Mail avec un système de tracking des emails.

## 🚀 Démarrage rapide

1. **Installer les dépendances:**
   ```bash
   pnpm install
   ```

2. **Configurer les credentials:**
   - Les credentials sont déjà dans `.env.local`
   - AccessKeyId: `LTAI5tCiAoydKorbGvafhiTB`
   - AccessKeySecret: `QUvMfHhlicgnMhqyFvPhxnbrKs7i8Z`
   - **Sender Email (vérifié):** `notifications@mail.rcdm.ink`

3. **Démarrer le serveur de développement:**
   ```bash
   pnpm dev
   ```

4. **Accéder à la page de test:**
   - Ouvrir: http://localhost:3000/email-test
   - L'adresse d'envoi est pré-remplie avec `notifications@mail.rcdm.ink`
   - Entrez votre adresse email de test dans "To Address"
   - Cliquez sur "Envoyer l'email"

## 📋 Prérequis Alibaba Cloud

## 📋 Prérequis Alibaba Cloud

**⚠️ IMPORTANT:** L'adresse email `notifications@mail.rcdm.ink` DOIT être vérifiée dans Alibaba Cloud avant de pouvoir envoyer des emails.

### Vérification de l'adresse email sur Alibaba Cloud:

1. **Aller sur la console Direct Mail:**
   - URL: https://dm.console.aliyun.com/
   - Connectez-vous avec vos credentials

2. **Vérifier votre adresse email:**
   - Allez dans "Sender Addresses" / "Adresses d'envoi"
   - Cliquez sur "New Sender Address" / "Nouvelle adresse"
   - Entrez: `notifications@mail.rcdm.ink`
   - Alibaba Cloud va envoyer un email de vérification
   - Cliquez sur le lien de vérification dans l'email

3. **Attendre la validation:**
   - Le statut doit passer à "Verified" / "Vérifié"
   - Cela peut prendre quelques minutes

4. **Configurer le domaine (optionnel mais recommandé):**
   - Si vous souhaitez envoyer depuis plusieurs adresses @mail.rcdm.ink
   - Vérifiez le domaine complet dans "Domain Management"
   - Ajoutez les enregistrements DNS requis (SPF, DKIM, etc.)

### Si l'erreur "InvalidMailAddress.NotFound" persiste:

- Vérifiez que l'adresse est bien dans le status "Verified"
- Assurez-vous d'utiliser la même région (endpoint) où l'adresse a été vérifiée
- Le endpoint actuel est: `dm.aliyuncs.com` (Hangzhou)

Avant de pouvoir envoyer des emails, vous devez:

1. **Activer le service Direct Mail** dans votre console Alibaba Cloud
2. **Vérifier votre domaine** ou votre adresse email d'envoi
3. **Configurer un "Account Name"** (adresse email d'envoi vérifiée)

### Étapes de configuration sur Alibaba Cloud:

1. Aller sur la console [Alibaba Cloud Direct Mail](https://dm.console.aliyun.com/)
2. Activer le service Direct Mail
3. Vérifier votre domaine ou une adresse email spécifique
4. Créer un "Sender Address" (accountName)
5. Utiliser cet accountName dans le formulaire de test

## 📁 Structure du projet

```
apps/web/
├── lib/
│   ├── alibaba-email.ts      # Client Alibaba Cloud DM
│   └── email-storage.ts      # Système de stockage en fichier
├── app/
│   ├── api/
│   │   ├── send-email/       # API pour envoyer des emails
│   │   │   └── route.ts
│   │   └── emails/           # API pour récupérer/mettre à jour les emails
│   │       ├── route.ts
│   │       └── [id]/route.ts
│   └── email-test/
│       └── page.tsx          # Interface de test
└── emails-log.json           # Stockage des emails (créé automatiquement)
```

## 🎯 Fonctionnalités

### 1. Envoi d'emails
- Interface de formulaire simple
- Support HTML et texte brut
- Validation des champs requis
- Retour immédiat du résultat d'envoi

### 2. Tracking des emails
- Sauvegarde automatique dans `emails-log.json`
- Statut d'envoi (sent/failed/pending)
- Statut de délivrabilité (delivered/bounced/complained/pending)
- Historique complet avec timestamps

### 3. Statistiques
- Total des emails envoyés
- Nombre d'emails réussis/échoués
- Taux de délivrabilité
- Bounces et plaintes

### 4. Mise à jour manuelle du statut
- Boutons pour simuler la délivrabilité
- Permet de tester le système de tracking

## 🔧 API Endpoints

### POST /api/send-email
Envoie un email via Alibaba Cloud DM

**Body:**
```json
{
  "accountName": "noreply@votredomaine.com",
  "fromAlias": "Mon Application",
  "toAddress": "destinataire@example.com",
  "subject": "Sujet de l'email",
  "htmlBody": "<h1>Contenu HTML</h1>",
  "textBody": "Contenu texte (fallback)"
}
```

### GET /api/emails
Récupère tous les emails et les statistiques

**Response:**
```json
{
  "emails": [...],
  "stats": {
    "total": 10,
    "sent": 8,
    "failed": 2,
    "delivered": 6,
    "bounced": 1,
    "complained": 0,
    "pending": 3
  }
}
```

### PATCH /api/emails/[id]
Met à jour le statut de délivrabilité d'un email

**Body:**
```json
{
  "deliveryStatus": "delivered" // ou "bounced", "complained", "pending"
}
```

## 📊 Format du fichier emails-log.json

```json
[
  {
    "id": "email_1234567890_abc123",
    "to": "destinataire@example.com",
    "subject": "Test Email",
    "htmlBody": "<h1>Hello</h1>",
    "fromAlias": "Test Sender",
    "accountName": "noreply@votredomaine.com",
    "addressType": 1,
    "replyToAddress": true,
    "sentAt": "2026-01-17T15:30:00.000Z",
    "status": "sent",
    "deliveryStatus": "pending",
    "alibabaResponse": {...},
    "updatedAt": "2026-01-17T15:30:00.000Z"
  }
]
```

## ⚠️ Notes importantes

1. **Environnement de test:** Cette configuration utilise un fichier JSON pour le stockage. En production, utilisez une vraie base de données.

2. **Sécurité:** Les credentials sont actuellement en dur. En production:
   - Utilisez des variables d'environnement
   - Ne commitez jamais `.env.local`
   - Utilisez un système de secrets (AWS Secrets Manager, etc.)

3. **Rate Limiting:** Alibaba Cloud a des limites d'envoi. Consultez votre quota dans la console.

4. **Délivrabilité:** Les statuts de délivrabilité doivent normalement être mis à jour via des webhooks. Cette implémentation permet une mise à jour manuelle pour les tests.

## 🐛 Dépannage

### Erreur: "InvalidAccountName"
- Vérifiez que l'accountName est bien vérifié dans la console Alibaba Cloud
- Assurez-vous d'utiliser le bon format (email complet)

### Erreur: "InvalidAccessKeyId"
- Vérifiez vos credentials dans `.env.local`
- Assurez-vous que l'AccessKey a les permissions Direct Mail

### Erreur: "SignatureDoesNotMatch"
- Vérifiez que l'AccessKeySecret est correct
- Pas d'espaces ou caractères supplémentaires

## 📚 Ressources

- [Documentation Alibaba Cloud DM](https://www.alibabacloud.com/help/en/directmail)
- [SDK TypeScript](https://github.com/aliyun/alibabacloud-typescript-sdk)
- [Console Direct Mail](https://dm.console.aliyun.com/)
