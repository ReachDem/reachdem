# Intégration Alibaba Cloud Direct Mail - Documentation Complète

## 📋 Vue d'ensemble

Ce document détaille l'intégration complète d'Alibaba Cloud Direct Mail (DM) pour l'envoi d'emails et la gestion automatisée des domaines, suivant un workflow similaire à Resend.

**Date:** Janvier 2026  
**Version:** 1.0  
**Auteur:** ReachDem Team

---

## 🎯 Objectifs

1. **Envoi d'emails via Alibaba Cloud DM** avec tracking complet des messages
2. **Gestion automatisée des domaines** : création, configuration DNS, vérification
3. **Génération automatique des DNS records** (SPF, DKIM, DMARC, MX, Ownership)
4. **Interface utilisateur moderne** avec Tailwind CSS pour visualiser et copier les configurations
5. **Vérification en temps réel** du statut d'authentification via les APIs Alibaba

---

## 🏗️ Architecture

### Stack Technique

- **Framework:** Next.js 15/16 (App Router)
- **Runtime:** Node.js avec TypeScript
- **SDK:** `@alicloud/dm20151123` v1.8.2
- **Styling:** Tailwind CSS v4
- **Storage:** JSON file-based (local)
- **Région:** eu-central-1

### Structure des Fichiers

```
apps/web/
├── lib/
│   ├── alibaba-email.ts        # Client Alibaba DM + helpers
│   ├── domain-storage.ts       # Persistence des domaines
│   ├── email-storage.ts        # Tracking des emails
│   └── dns-verify.ts           # Vérification DNS locale
├── app/
│   ├── api/
│   │   ├── send-email/route.ts
│   │   ├── emails/route.ts
│   │   ├── domains/route.ts
│   │   └── domains/[domain]/
│   │       ├── route.ts
│   │       ├── verify/route.ts
│   │       └── import-alibaba/route.ts
│   ├── email-test/page.tsx     # UI envoi d'emails
│   └── domain-test/page.tsx    # UI gestion domaines
├── emails-log.json             # Historique des emails
├── domains-log.json            # Domaines configurés
└── .env.local                  # Credentials Alibaba
```

---

## 🔑 Configuration Initiale

### Variables d'environnement

Fichier `.env.local` :

```env
ALIBABA_ACCESS_KEY_ID=
ALIBABA_ACCESS_KEY_SECRET=
ALIBABA_REGION=eu-central-1
```

### Endpoint

```
dm.eu-central-1.aliyuncs.com
```

---

## 📧 Fonctionnalité 1 : Envoi d'Emails

### Fichiers Impliqués

- `lib/alibaba-email.ts` : `sendEmail()`, `sendTestEmail()`
- `lib/email-storage.ts` : Tracking des messages
- `app/api/send-email/route.ts` : Endpoint API
- `app/email-test/page.tsx` : Interface utilisateur

### Flow d'Envoi

1. **Requête POST** vers `/api/send-email`
2. **Appel Alibaba** via `SingleSendMailRequest`
3. **Enregistrement** dans `emails-log.json`
4. **Retour** du statut et ID du message

### Structure du Log Email

```json
{
  "id": "email_1234567890_abc123",
  "from": "notifications@mail.rcdm.ink",
  "to": "user@example.com",
  "subject": "Test Email",
  "status": "sent",
  "provider": "alibaba_dm",
  "providerMessageId": "abc123-def456",
  "sentAt": "2026-01-18T10:30:00.000Z",
  "deliveredAt": null,
  "bouncedAt": null,
  "deliverabilityStatus": "pending"
}
```

### API Alibaba Utilisée

**API:** `SingleSendMail`  
**Méthode:** `client.singleSendMailWithOptions()`  
**Documentation:** Alibaba Cloud Direct Mail API Reference

---

## 🌐 Fonctionnalité 2 : Gestion des Domaines

### Workflow Complet

```
1. Utilisateur entre domaine (ex: mail.mondomaine.com)
   ↓
2. Création sur Alibaba (CreateDomain API)
   → Retour domainId
   ↓
3. Import automatique DNS (QueryDomain + DescDomain APIs)
   → Récupération des configs réelles (SPF, DKIM, DMARC, MX, Ownership)
   ↓
4. Sauvegarde locale (domains-log.json)
   ↓
5. Affichage des 5 DNS records à configurer
   ↓
6. Utilisateur configure chez son registrar (Namecheap, GoDaddy, etc.)
   ↓
7. Vérification manuelle (bouton "Vérifier DNS")
   → Alibaba retourne statuts d'authentification
   ↓
8. Affichage des badges de statut (✓ vérifié / ✗ en attente)
```

### Fichiers Impliqués

- `lib/alibaba-email.ts` : APIs Alibaba (CreateDomain, QueryDomain, DescDomain)
- `lib/domain-storage.ts` : CRUD domaines
- `app/api/domains/route.ts` : Création de domaine
- `app/api/domains/[domain]/import-alibaba/route.ts` : Import DNS
- `app/api/domains/[domain]/verify/route.ts` : Vérification
- `app/domain-test/page.tsx` : Interface utilisateur

---

## 🔧 APIs Alibaba Utilisées

### 1. CreateDomain

**Objectif:** Créer un nouveau domaine sur Alibaba DM  
**Endpoint:** `CreateDomain`  
**Params:** `{ domainName: string }`  
**Retour:** `{ domainId: string }`

```typescript
alibabaCreateDomain(domain: string)
```

### 2. QueryDomainByParam

**Objectif:** Récupérer le domainId à partir du nom de domaine  
**Endpoint:** `QueryDomainByParam`  
**Params:** `{ domainName: string, pageNo: 1, pageSize: 1 }`  
**Retour:** `{ domain: [{ domainId, domainStatus, ... }] }`

```typescript
alibabaQueryDomain(domain: string)
```

### 3. DescDomain (★ Principal)

**Objectif:** Récupérer la configuration complète DNS et les statuts d'authentification  
**Endpoint:** `DescDomain`  
**Params:** `{ domainId: number, requireRealTimeDnsRecords: true }`  
**Retour:**

```json
{
  "domainId": "5171",
  "domainName": "mail.reachdem.li",
  "hostRecord": "aliyundm.mail",
  "domainType": "6bd86901b9fe4618a046",
  "spfRecordV2": "v=spf1 include:spfdm-eu-central-1.aliyun.com -all",
  "dkimRR": "aliyun-eu-central-1._domainkey.mail",
  "dkimPublicKey": "v=DKIM1; k=rsa; p=MIGfMA0GCSq...",
  "dmarcHostRecord": "_dmarc.mail",
  "dmarcRecord": "v=DMARC1;p=none;rua=mailto:dmarc_report@aliyun.com",
  "mxRecord": "mxdm-eu-central-1.aliyun.com",
  "spfAuthStatus": "0",
  "mxAuthStatus": "0",
  "dkimAuthStatus": "0",
  "dmarcAuthStatus": 0,
  "cnameAuthStatus": "1"
}
```

**Statuts:**
- `0` = ✅ Vérifié
- `1` = ❌ Non vérifié

```typescript
alibabaDescribeDomain(domainId: number, requireRealTimeDnsRecords: boolean = true)
```

### 4. CheckDomain

**Objectif:** Vérification rapide du statut d'un domaine  
**Endpoint:** `CheckDomain`  
**Params:** `{ domainName: string }`

```typescript
alibabaCheckDomain(domain: string)
```

---

## 📝 DNS Records Générés

Lors de l'import automatique, **5 enregistrements DNS** sont générés :

### 1. Ownership Verification (TXT)

**Type:** TXT  
**Nom:** `aliyundm.mail` (ou hostRecord depuis Alibaba)  
**Valeur:** Token unique (ex: `6bd86901b9fe4618a046`)  
**Requis:** ✅ Oui  
**Description:** Preuve de propriété du domaine

### 2. SPF Record (TXT)

**Type:** TXT  
**Nom:** Subdomain (ex: `mail`)  
**Valeur:** `v=spf1 include:spfdm-eu-central-1.aliyun.com -all`  
**Requis:** ✅ Oui  
**Description:** Autorise Alibaba à envoyer des emails pour ce domaine

### 3. DKIM Record (TXT)

**Type:** TXT  
**Nom:** `aliyun-eu-central-1._domainkey.mail` (dkimRR depuis Alibaba)  
**Valeur:** `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4...` (clé publique)  
**Requis:** ✅ Oui  
**Description:** Signature cryptographique des emails

### 4. DMARC Record (TXT)

**Type:** TXT  
**Nom:** `_dmarc.mail`  
**Valeur:** `v=DMARC1;p=none;rua=mailto:dmarc_report@aliyun.com`  
**Requis:** ⚠️ Optionnel  
**Description:** Politique de traitement des emails non authentifiés

### 5. MX Record

**Type:** MX  
**Nom:** Subdomain (ex: `mail`)  
**Valeur:** `mxdm-eu-central-1.aliyun.com`  
**Requis:** ✅ Oui  
**Description:** Serveur de réception des emails

---

## 🎨 Interface Utilisateur

### Page Domain Management (`/domain-test`)

#### Fonctionnalités

1. **Création de domaine**
   - Input : nom de domaine
   - Bouton "Créer le domaine"
   - Création + Import DNS automatique

2. **Bouton "Vérifier tous les domaines"**
   - Vérification en parallèle de tous les domaines
   - Mise à jour des statuts en temps réel

3. **Liste des domaines**
   - Nom du domaine
   - Badge de statut global (✅ Vérifié / ⏳ En attente)
   - Badge nombre de DNS records
   - **Badges de statut individuels :**
     - SPF: ✓ ou ✗
     - MX: ✓ ou ✗
     - DKIM: ✓ ou ✗
     - DMARC: ✓ ou ✗

4. **DNS Records**
   - Type (TXT, MX)
   - Statut (✓ Vérifié / ✗ En attente)
   - Nom (copiable)
   - Valeur (copiable, fond noir)
   - Description

#### Design

- **Framework CSS:** Tailwind CSS v4
- **Style:** Cards avec bordures arrondies, ombres légères
- **Couleurs:**
  - Vert (`bg-green-100`, `text-green-700`) : Vérifié
  - Rouge (`bg-red-100`, `text-red-700`) : En attente
  - Violet (`bg-violet-100`, `text-violet-700`) : Info
  - Amber (`bg-amber-100`, `text-amber-700`) : Pending
- **Typographie:** Font mono pour les valeurs DNS
- **Responsive:** Layout adaptatif avec grid Tailwind

---

## 🔍 Système de Vérification

### Vérification Locale (DNS Resolver)

**Fichier:** `lib/dns-verify.ts`

Utilise le module Node.js `dns/promises` pour résoudre :
- TXT records
- MX records
- CNAME records
- A/AAAA records

Compare les valeurs attendues vs réelles.

### Vérification Alibaba (Temps Réel)

**Route:** `/api/domains/[domain]/verify`

**Flow:**
1. Query domainId via `QueryDomainByParam`
2. Describe domain via `DescDomain` avec `requireRealTimeDnsRecords=true`
3. Parse auth status :
   ```typescript
   parseDomainAuthStatus(descBody) → {
     allVerified: boolean,
     details: { spf: 0|1, mx: 0|1, dkim: 0|1, dmarc: 0|1, cname: 0|1 }
   }
   ```
4. Mise à jour du statut : `verified` si tous = 0, sinon `pending`
5. Sauvegarde dans `lastCheckResult.alibabaStatus`

### Gestion des Types Mixtes (Bug SDK)

**Problème:** Le SDK Alibaba retourne :
- `spfAuthStatus`, `mxAuthStatus`, `dkimAuthStatus`, `cnameAuthStatus` : **string** (`"0"` ou `"1"`)
- `dmarcAuthStatus` : **number** (`0` ou `1`)

**Solution:**
```typescript
const spf = Number(descBody?.spfAuthStatus ?? 1);
const dmarc = Number(descBody?.dmarcAuthStatus ?? 1);
```

Utilisation de `Number()` + opérateur `??` pour gérer les deux types.

---

## 📊 Structure des Données

### DomainEntry (domains-log.json)

```typescript
interface DomainEntry {
  id: string;                    // "domain_1234567890_abc123"
  domain: string;                // "mail.mondomaine.com"
  provider: 'alibaba_dm';
  records: DnsRecordSpec[];      // 5 DNS records
  status: 'pending' | 'verified' | 'failed';
  createdAt: string;             // ISO 8601
  updatedAt: string;
  lastCheckAt?: string;
  lastCheckResult?: {
    ok: boolean;
    missing: DnsRecordSpec[];
    mismatched: Array<{ expected: DnsRecordSpec; found?: string[] }>;
    details?: any;
    alibabaStatus?: {
      domainId: number;
      domainStatus: string;
      authStatus: {
        allVerified: boolean;
        details: { spf: 0|1, mx: 0|1, dkim: 0|1, dmarc: 0|1, cname: 0|1 }
      };
      dnsValues: {
        dnsTxt: string;
        dnsSpf: string;
        dnsMx: string;
        dnsDmarc: string;
      };
    };
  };
}
```

### DnsRecordSpec

```typescript
interface DnsRecordSpec {
  type: 'TXT' | 'MX' | 'CNAME' | 'A' | 'AAAA';
  name: string;          // "aliyun-eu-central-1._domainkey.mail"
  value: string;         // "v=DKIM1; k=rsa; p=..."
  required?: boolean;    // true par défaut
  description?: string;  // "DKIM Verification (Alibaba DM)"
}
```

---

## 🚀 Guide d'Utilisation

### 1. Créer un Domaine

1. Accéder à `/domain-test`
2. Entrer le nom de domaine (ex: `mail.mondomaine.com`)
3. Cliquer sur **"Créer le domaine"**
4. ✅ Le domaine est créé sur Alibaba
5. ✅ Les 5 DNS records sont automatiquement importés

### 2. Configurer les DNS

1. Copier chaque DNS record (bouton "Copier")
2. Se connecter au registrar du domaine (Namecheap, GoDaddy, etc.)
3. Ajouter les 5 enregistrements :
   - 1× Ownership TXT
   - 3× TXT (SPF, DKIM, DMARC)
   - 1× MX

**Exemple Namecheap:**
- Type: TXT
- Host: `aliyundm.mail`
- Value: `6bd86901b9fe4618a046`
- TTL: Automatic

### 3. Vérifier la Configuration

**Option A:** Vérification individuelle
1. Cliquer sur **"Vérifier"** pour un domaine

**Option B:** Vérification globale
1. Cliquer sur **"🔄 Vérifier tous les domaines"**

### 4. Interpréter les Résultats

**Badges de statut:**
- ✅ **Vérifié** (vert) : Le record est correctement configuré
- ✗ **En attente** (rouge) : Le record n'est pas encore détecté

**Délai de propagation DNS:** 5 minutes à 48 heures (généralement < 1 heure)

### 5. Envoyer des Emails

Une fois le domaine vérifié (statut = `verified`), vous pouvez envoyer des emails :

```typescript
await sendEmail({
  accountName: 'notifications@mail.mondomaine.com',
  fromAlias: 'Mon Application',
  addressType: 1,
  replyToAddress: true,
  toAddress: 'user@example.com',
  subject: 'Bienvenue!',
  htmlBody: '<h1>Hello!</h1>',
});
```

---

## 🐛 Debugging et Logs

### Préfixes de Logs

Tous les logs utilisent des préfixes pour faciliter le debugging :

- `[ALIBABA]` : Appels API Alibaba
- `[API]` : Routes API Next.js
- `[STORAGE]` : Opérations de fichiers JSON
- `[DNS]` : Vérifications DNS
- `[UI]` : Actions utilisateur

### Exemples de Logs

```
[API] POST /api/domains - Creating domain: mail.reachdem.li
[ALIBABA] alibabaCreateDomain - Calling Alibaba API...
[ALIBABA] alibabaCreateDomain - SUCCESS: { domainId: '5171' }
[API] POST /api/domains/mail.reachdem.li/import-alibaba - Step 1: Querying Alibaba...
[ALIBABA] alibabaQueryDomain - SUCCESS
[API] POST /api/domains/mail.reachdem.li/import-alibaba - Step 2: Describe domain via DescDomain...
[ALIBABA] alibabaDescribeDomain - SUCCESS
[ALIBABA] parseDomainAuthStatus - Raw values: { spfAuthStatus: '0', dmarcAuthStatus: 0 }
[ALIBABA] parseDomainAuthStatus - Parsed: SPF=0, MX=0, DKIM=0, DMARC=0, allVerified=true
[STORAGE] updateDomainRecords - Domain: mail.reachdem.li, Records: 5
```

### Logs Détaillés

Pour chaque appel API, les logs incluent :
- Requête complète (JSON)
- Réponse complète (JSON)
- Erreurs avec recommandations Alibaba

---

## 🔒 Sécurité

### Credentials

- ✅ Stockés dans `.env.local` (non versionné)
- ✅ Accès via `process.env`
- ⚠️ Ne jamais commit les credentials dans Git

### Validation

- ✅ Vérification des domaines avant création
- ✅ Validation des statuts Alibaba
- ✅ Gestion des erreurs API

---

## 📈 Améliorations Futures

### Fonctionnalités Potentielles

1. **Webhook Alibaba** : Notifications automatiques de statut d'email
2. **Analytics** : Dashboard avec statistiques d'envoi
3. **Templates** : Gestion de templates d'emails HTML
4. **Batch Sending** : Envoi en masse avec `BatchSendMail`
5. **Auto-refresh** : Polling automatique du statut des domaines
6. **Database** : Migration vers PostgreSQL/MongoDB
7. **Multi-région** : Support de plusieurs régions Alibaba

### Optimisations

1. Caching des configurations DNS
2. Rate limiting sur les vérifications
3. Queue system pour les envois d'emails
4. Retry logic avec exponential backoff

---

## 📚 Ressources

### Documentation Alibaba

- [Alibaba Cloud Direct Mail Console](https://dm.console.aliyun.com/)
- [API Reference](https://www.alibabacloud.com/help/en/directmail/)
- [SDK GitHub](https://github.com/aliyun/alibabacloud-dm-sdk)

### Documentation Interne

- Code source : `apps/web/`
- Logs : `domains-log.json`, `emails-log.json`
- Ce guide : `guides/alibaba-dm-integration.md`

---

## ✅ Checklist de Validation

### Configuration Initiale
- [ ] Credentials Alibaba configurés dans `.env.local`
- [ ] SDK `@alicloud/dm20151123` installé
- [ ] Tailwind CSS configuré

### Domaine
- [ ] Domaine créé sur Alibaba (domainId reçu)
- [ ] 5 DNS records importés automatiquement
- [ ] DNS configurés chez le registrar
- [ ] Vérification retourne `allVerified: true`
- [ ] Statut = `verified` dans l'UI

### Emails
- [ ] Email envoyé avec succès (status 200)
- [ ] Message ID reçu d'Alibaba
- [ ] Email enregistré dans `emails-log.json`
- [ ] Email reçu par le destinataire

---

## 🎯 Conclusion

L'intégration Alibaba Cloud Direct Mail est **complète et fonctionnelle** avec :

✅ Création automatique de domaines  
✅ Import automatique de la configuration DNS réelle  
✅ Vérification en temps réel via les APIs Alibaba  
✅ Interface utilisateur moderne et intuitive  
✅ Logs détaillés pour le debugging  
✅ Gestion des types mixtes du SDK Alibaba  

**Prêt pour la production** après configuration des DNS chez le registrar.

---

**Dernière mise à jour:** 18 janvier 2026  
**Contacts:** ReachDem Team
