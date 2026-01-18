# Test Rapide - Alibaba Cloud Direct Mail

## ✅ Checklist de vérification

### 1. Vérifier que l'adresse email est configurée
**Adresse:** `notifications@mail.rcdm.ink`

**Console Alibaba Cloud:**
1. Aller sur: https://dm.console.aliyun.com/
2. Section: "Sender Addresses" (Adresses d'envoi)
3. Vérifier que `notifications@mail.rcdm.ink` apparaît avec le statut "Verified" (Vérifié)

❌ Si l'adresse n'est PAS vérifiée:
- Cliquer sur "New Sender Address"
- Entrer: `notifications@mail.rcdm.ink`
- Valider l'email de vérification envoyé par Alibaba

### 2. Tester l'envoi d'email

**Ouvrir la page de test:**
```
http://localhost:3000/email-test
```

**Formulaire pré-rempli:**
- Account Name: `notifications@mail.rcdm.ink` ✅ (déjà rempli)
- From Alias: `ReachDem Notifications` ✅ (déjà rempli)
- To Address: **VOTRE EMAIL DE TEST** ⬅️ À remplir
- Subject: `Test Email` ✅ (déjà rempli)

**Tester:**
1. Entrez votre email personnel dans "To Address"
2. Cliquez sur "Envoyer l'email"
3. Vérifiez le résultat dans la section "Résultat de l'envoi"

### 3. Résultats possibles

#### ✅ Succès
```json
{
  "success": true,
  "emailRecord": { ... },
  "alibabaResponse": { ... }
}
```
→ Email envoyé avec succès! Vérifiez votre boîte mail.

#### ❌ Erreur: InvalidMailAddress.NotFound
```
code: 404, The specified mail address is not found
```
→ L'adresse `notifications@mail.rcdm.ink` n'est PAS vérifiée sur Alibaba Cloud
→ Suivez l'étape 1 ci-dessus

#### ❌ Erreur: InvalidAccessKeyId
```
InvalidAccessKeyId.NotFound
```
→ Les credentials sont incorrects
→ Vérifiez le fichier `.env.local`

## 📊 Visualiser les emails envoyés

Une fois l'email envoyé avec succès, vous verrez:

1. **Statistiques en haut de page:**
   - Total
   - Envoyés
   - Échoués
   - Livrés

2. **Liste des emails:**
   - ID unique
   - Destinataire
   - Sujet
   - Date d'envoi
   - Statut
   - Actions (voir détails, mettre à jour le statut)

## 🔄 Mettre à jour le statut de délivrabilité

Pour chaque email dans la liste, vous pouvez:
1. Cliquer sur "Voir les détails"
2. Mettre à jour le statut de délivrabilité:
   - **Delivered** (Livré) - Email reçu avec succès
   - **Bounced** (Rejeté) - Email rejeté par le serveur
   - **Complained** (Spam) - Marqué comme spam
   - **Pending** (En attente) - Statut initial

## 📁 Fichier de stockage

Tous les emails sont stockés dans:
```
apps/web/emails-log.json
```

Structure:
```json
[
  {
    "id": "email_1737134400000_abc123",
    "to": "test@example.com",
    "subject": "Test Email",
    "status": "sent",
    "deliveryStatus": "pending",
    "sentAt": "2026-01-17T15:30:00.000Z",
    ...
  }
]
```

## 🎯 Test complet

### Scénario 1: Premier envoi
1. ✅ Vérifier l'adresse sur Alibaba Cloud
2. ✅ Entrer votre email de test
3. ✅ Cliquer sur "Envoyer"
4. ✅ Vérifier votre boîte mail
5. ✅ Mettre à jour le statut à "Delivered" si reçu

### Scénario 2: Envoi multiple
1. ✅ Envoyer à plusieurs adresses différentes
2. ✅ Observer les statistiques se mettre à jour
3. ✅ Tester différents statuts de délivrabilité

### Scénario 3: Erreur volontaire
1. ✅ Modifier l'accountName à une adresse non vérifiée
2. ✅ Observer l'erreur "InvalidMailAddress.NotFound"
3. ✅ Remettre `notifications@mail.rcdm.ink`

## 🚨 En cas de problème

1. **Vérifier le serveur de développement:**
   ```bash
   pnpm dev
   ```

2. **Vérifier les logs dans le terminal:**
   - Recherchez les erreurs Alibaba Cloud
   - Vérifiez les recommendations URLs

3. **Vérifier le fichier .env.local:**
   ```bash
   cat apps/web/.env.local
   ```

4. **Ouvrir la console navigateur:**
   - F12 → Console
   - Vérifier les erreurs réseau

## 📞 Support

En cas d'erreur persistante, consulter:
- [Documentation Alibaba Cloud DM](https://www.alibabacloud.com/help/en/directmail)
- [API Reference](https://api.alibabacloud.com/product/Dm)
- Recommendation URL dans les messages d'erreur
