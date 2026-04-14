# Debug: Sender Name dans les emails de test

## Problème

Le sender name personnalisé n'apparaît pas toujours dans les emails de test reçus.

## Logs ajoutés pour le débogage

### 1. Client (EmailComposer)

**Fichier**: `apps/web/components/campaigns/email-composer.tsx`

Lors du clic sur "Test", vérifiez dans la console du navigateur :

```
[EmailComposer] Sending test email with payload: {
  subject: "...",
  htmlContent: "...",
  fromName: "MyShop Store"  // ← Vérifier cette valeur
}
```

### 2. API Route (Test)

**Fichier**: `apps/web/app/api/v1/campaigns/test/route.ts`

Dans les logs du serveur Next.js :

```
[Test Email] Using sender name: {
  customFromName: "MyShop Store",  // ← Après trim
  finalFromName: "MyShop Store",   // ← Valeur finale utilisée
  envSenderName: "ReachDem Notifications"
}
```

### 3. EnqueueEmailUseCase

**Fichier**: `packages/core/src/services/enqueue-email.usecase.ts`

Dans les logs du serveur :

```
[EnqueueEmailUseCase] Creating message with from: {
  inputFrom: "MyShop Store",  // ← Valeur reçue
  finalFrom: "MyShop Store"   // ← Valeur sauvegardée en DB
}
```

### 4. Worker (Alibaba Direct Mail)

**Fichier**: `apps/workers/src/alibaba-direct-mail.ts`

Dans les logs du worker Cloudflare :

```
[Alibaba Direct Mail] Sender configuration: {
  inputFromName: "MyShop Store",     // ← Valeur reçue du message
  customFromName: "MyShop Store",    // ← Après trim
  finalFromAlias: "MyShop Store",    // ← Valeur finale envoyée à Alibaba
  envAlibabaName: undefined,
  envSenderName: "ReachDem Notifications"
}
```

## Étapes de débogage

### Étape 1: Vérifier le client

1. Ouvrir la console du navigateur (F12)
2. Remplir le champ "Sender Name" avec "MyShop Store"
3. Cliquer sur "Test"
4. Vérifier le log `[EmailComposer]` - le `fromName` doit être "MyShop Store"

**Si le fromName est vide ou undefined** :

- Problème dans le composant EmailComposer
- Vérifier que `value.fromName` est bien défini

### Étape 2: Vérifier l'API Route

1. Regarder les logs du serveur Next.js
2. Chercher le log `[Test Email]`
3. Vérifier que `customFromName` et `finalFromName` sont corrects

**Si customFromName est vide** :

- Le fromName n'est pas arrivé à l'API
- Vérifier la requête HTTP dans l'onglet Network du navigateur

**Si finalFromName utilise la valeur par défaut** :

- Le fromName était vide après trim
- Vérifier qu'il n'y a pas que des espaces

### Étape 3: Vérifier EnqueueEmailUseCase

1. Regarder les logs du serveur
2. Chercher le log `[EnqueueEmailUseCase]`
3. Vérifier que `inputFrom` est correct

**Si inputFrom est incorrect** :

- Problème dans la route API
- Vérifier la logique de `fromName` dans route.ts

### Étape 4: Vérifier le Worker

1. Regarder les logs du worker Cloudflare
2. Chercher le log `[Alibaba Direct Mail]`
3. Vérifier que `finalFromAlias` est correct

**Si inputFromName est vide** :

- Le message en DB n'a pas le bon `from`
- Vérifier la base de données : `SELECT id, "from", subject FROM message ORDER BY "createdAt" DESC LIMIT 5;`

**Si finalFromAlias utilise la valeur par défaut** :

- Le worker utilise les variables d'environnement au lieu du fromName
- Vérifier que la logique de priorité est correcte

### Étape 5: Vérifier les variables d'environnement du Worker

Si le worker a ces variables définies, elles peuvent écraser le fromName :

```env
ALIBABA_SENDER_NAME=ReachDem Notifications
SENDER_NAME=ReachDem Notifications
```

**Solution** : La logique a été modifiée pour donner la priorité à `input.fromName`

## Vérification de la base de données

Pour vérifier que le message a été créé avec le bon sender name :

```sql
SELECT
  id,
  "from",
  subject,
  "toEmail",
  status,
  "createdAt"
FROM message
WHERE subject LIKE '[TEST]%'
ORDER BY "createdAt" DESC
LIMIT 5;
```

Le champ `from` doit contenir "MyShop Store" et non "ReachDem Notifications".

## Vérification de l'email reçu

Dans l'email reçu, vérifier :

- **Expéditeur affiché** : Doit être "MyShop Store"
- **Adresse email** : Sera toujours `notifications@mail.rcdm.ink` (ou votre ALIBABA_SENDER_EMAIL)

Format attendu : `MyShop Store <notifications@mail.rcdm.ink>`

## Problèmes connus

### 1. Limite de 15 caractères (Alibaba Direct Mail)

**IMPORTANT** : Alibaba Cloud Direct Mail impose une limite de **15 caractères maximum** pour le paramètre `FromAlias` (sender name).

Si vous dépassez cette limite :

- Le worker tronquera automatiquement le nom à 15 caractères
- Un warning sera affiché dans les logs
- Exemple : "ReachDem Notifications" (22 chars) → "ReachDem Notifi" (15 chars)

**Solution** : Utilisez des noms courts comme "ReachDem", "MyShop", "Support", etc.

### 2. Chaîne vide vs undefined

Si le champ Sender Name est vidé puis rempli à nouveau, il peut rester une chaîne vide `""` au lieu de `undefined`.

**Solution appliquée** : Trim et vérification de longueur dans la route API et le worker.

### 3. Cache du navigateur

Le navigateur peut cacher l'ancienne valeur de `fromName`.

**Solution** : Rafraîchir la page (Ctrl+F5) avant de tester.

### 4. Variables d'environnement prioritaires

Si `ALIBABA_SENDER_NAME` ou `SENDER_NAME` sont définies dans le worker, elles peuvent écraser le fromName.

**Solution appliquée** : Priorité donnée à `input.fromName` dans le worker.

## Test complet

1. Ouvrir la console du navigateur
2. Ouvrir les logs du serveur Next.js
3. Ouvrir les logs du worker Cloudflare
4. Remplir "Sender Name" avec "Test Sender 123"
5. Cliquer sur "Test"
6. Vérifier tous les logs dans l'ordre
7. Vérifier l'email reçu

Si tous les logs montrent "Test Sender 123" mais l'email affiche "ReachDem Notifications", le problème vient d'Alibaba Direct Mail ou de la configuration du compte.
