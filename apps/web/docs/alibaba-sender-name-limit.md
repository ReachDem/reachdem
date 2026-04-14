# Limite de 15 caractères pour le Sender Name (Alibaba Direct Mail)

## Problème identifié

Alibaba Cloud Direct Mail impose une **limite stricte de 15 caractères** pour le paramètre `FromAlias` (nom de l'expéditeur).

Source : [Documentation officielle Alibaba Cloud](https://www.alibabacloud.com/help/en/directmail/latest/singlesendmail)

> **FromAlias** : The sender alias. The alias can be up to 15 characters in length.
> For example, if you set the sender alias to "Alice" and the sender address to test@example.net, the recipient sees "Alice" <test@example.net>.

## Impact

Si le sender name dépasse 15 caractères :

- Alibaba rejette silencieusement l'alias
- L'email est envoyé avec un nom par défaut ou vide
- Aucune erreur n'est retournée par l'API

**Exemple problématique** :

- "ReachDem Notifications" = 22 caractères ❌
- "MyShop Store Team" = 17 caractères ❌

**Exemples valides** :

- "ReachDem" = 8 caractères ✅
- "MyShop Store" = 12 caractères ✅
- "Support Team" = 12 caractères ✅

## Solutions implémentées

### 1. Limite dans l'interface (EmailComposer)

```typescript
<Input
  maxLength={15}  // Empêche la saisie au-delà de 15 caractères
  placeholder="ReachDem"
/>
```

### 2. Validation dans l'API

```typescript
const testEmailSchema = z.object({
  fromName: z
    .string()
    .max(15, "Sender name cannot exceed 15 characters")
    .optional(),
});
```

### 3. Troncature dans le Worker

```typescript
if (fromAlias.length > 15) {
  console.warn(`FromAlias "${fromAlias}" exceeds limit, truncating`);
  fromAlias = fromAlias.substring(0, 15);
}
```

### 4. Valeur par défaut courte

- Ancien : "ReachDem Notifications" (22 chars) ❌
- Nouveau : "ReachDem" (8 chars) ✅

## Configuration recommandée

### Variables d'environnement

**Worker Cloudflare** (`wrangler.toml` ou Dashboard) :

```toml
[env.production.vars]
SENDER_NAME = "ReachDem"  # Max 15 caractères !
ALIBABA_SENDER_NAME = "ReachDem"  # Max 15 caractères !
```

**Application Web** (`.env.local`) :

```env
SENDER_NAME=ReachDem
```

## Exemples de noms courts efficaces

### Pour une entreprise

- "MyCompany" (9 chars)
- "Acme Corp" (9 chars)
- "TechStart" (9 chars)

### Pour un service

- "Support" (7 chars)
- "Notifications" (13 chars)
- "Updates" (7 chars)
- "Newsletter" (10 chars)

### Pour une marque

- "Nike" (4 chars)
- "Apple Store" (11 chars)
- "Amazon" (6 chars)

## Vérification

Pour vérifier que la limite est respectée :

1. **Console du navigateur** :

```
[EmailComposer] Sending test email with payload: {
  fromName: "ReachDem"  // ← Doit être ≤ 15 chars
}
```

2. **Logs du serveur** :

```
[Test Email] Using sender name: {
  finalFromName: "ReachDem",
  fromNameLength: 8  // ← Doit être ≤ 15
}
```

3. **Logs du worker** :

```
[Alibaba Direct Mail] Sender configuration: {
  finalFromAlias: "ReachDem",
  fromAliasLength: 8  // ← Doit être ≤ 15
}
```

## Erreurs Alibaba liées au FromAlias

Si vous voyez cette erreur dans les logs :

```
InvalidFromAlias.Malformed: The specified fromAlias is wrongly formed.
```

Cela signifie que :

- Le fromAlias dépasse 15 caractères
- Le fromAlias contient des caractères invalides

## Recommandations

1. **Utilisez des noms courts et mémorables** (≤ 15 chars)
2. **Testez toujours** avec le bouton "Test" avant d'envoyer une campagne
3. **Vérifiez l'email reçu** pour confirmer que le nom s'affiche correctement
4. **Évitez les noms génériques** comme "Notifications" seul (peu informatif)
5. **Privilégiez le nom de marque** : "ReachDem" plutôt que "Notifications"

## Format de l'email reçu

Avec `FromAlias = "ReachDem"` et `AccountName = "notifications@mail.rcdm.ink"` :

```
From: ReachDem <notifications@mail.rcdm.ink>
```

Le destinataire voit :

- **Nom affiché** : ReachDem
- **Adresse email** : notifications@mail.rcdm.ink
