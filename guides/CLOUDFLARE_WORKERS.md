# ☁️ Guide Cloudflare Workers — ReachDem

> **Audience :** Développeur backend  
> **Prérequis :** Connaissances de base en TypeScript et Node.js  
> **Dernière mise à jour :** 12 mars 2026

---

## Table des matières

1. [Introduction — C'est quoi un Worker ?](#1-introduction--cest-quoi-un-worker-)
2. [Architecture du projet](#2-architecture-du-projet)
3. [Les 3 handlers d'un Worker](#3-les-3-handlers-dun-worker)
4. [Cron Triggers (Schedulers)](#4-cron-triggers-schedulers)
5. [Cloudflare Queues](#5-cloudflare-queues)
6. [Configuration — wrangler.jsonc](#6-configuration--wranglerjsonc)
7. [Secrets et Variables d'environnement](#7-secrets-et-variables-denvironnement)
8. [Déploiement](#8-déploiement)
9. [Commandes utiles](#9-commandes-utiles)
10. [Implémentation cible — Vérification des messages programmés](#10-implémentation-cible--vérification-des-messages-programmés)

---

## 1. Introduction — C'est quoi un Worker ?

Un **Cloudflare Worker** est une fonction serverless qui s'exécute sur le réseau edge de Cloudflare (300+ data centers dans le monde). Contrairement à un serveur Node.js classique :

| Caractéristique       | Serveur classique                     | Cloudflare Worker                         |
| --------------------- | ------------------------------------- | ----------------------------------------- |
| **Infra**             | Tu gères un serveur (VPS, Docker…)    | Cloudflare gère tout                      |
| **Scalabilité**       | Manuelle                              | Automatique, illimitée                    |
| **Démarrage**         | Secondes                              | ~30ms (cold start)                        |
| **Durée d'exécution** | Illimitée                             | Max 30s (CPU time)                        |
| **État (mémoire)**    | Persistant tant que le serveur tourne | **Éphémère** — réinitialisé à tout moment |
| **Coût**              | Fixe (serveur allumé 24/7)            | À l'usage (100K requêtes/jour gratuites)  |

> ⚠️ **Point crucial :** Un Worker est **stateless**. Les variables en mémoire (`let counter = 0`) sont réinitialisées quand Cloudflare recycle l'instance. Ne **jamais** compter sur l'état en mémoire pour persister des données. Utiliser une base de données, KV, ou D1 à la place.

---

## 2. Architecture du projet

```
apps/workers/
├── wrangler.jsonc              # Configuration du Worker (routes, crons, queues, bindings)
├── .dev.vars                   # Variables d'env pour le développement local (secrets)
├── package.json                # Dépendances (wrangler, nodemailer, etc.)
├── tsconfig.json               # Configuration TypeScript
├── worker-configuration.d.ts   # Types auto-générés par `wrangler types`
└── src/
    ├── index.ts                # Point d'entrée — exporte les 3 handlers (fetch, queue, scheduled)
    ├── scheduled.ts            # Logique du cron trigger
    ├── queue-email.ts          # Consumer de la queue email
    ├── queue-sms.ts            # Consumer de la queue SMS
    └── types.ts                # Interfaces TypeScript (Env, SmsMessage, EmailMessage)
```

---

## 3. Les 3 handlers d'un Worker

Un Worker Cloudflare peut gérer **3 types d'événements**. Ils sont tous exportés depuis `src/index.ts` :

### 3.1 `fetch()` — Requêtes HTTP

C'est le handler principal. Il reçoit des requêtes HTTP entrantes, exactement comme un serveur Express.

```typescript
async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return Response.json({ status: "ok" });
  }

  if (request.method === "POST" && url.pathname === "/queue/email") {
    // Envoie un message dans la queue
    const body = await request.json() as EmailMessage;
    await env.EMAIL_QUEUE.send(body);
    return Response.json({ success: true });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
```

**URL du worker déployé :** `https://reachdem-worker.latioms.workers.dev`

### 3.2 `scheduled()` — Cron Triggers (Tâches planifiées)

Ce handler est appelé automatiquement par Cloudflare selon un planning défini (cron). Il n'est **pas** déclenché par une requête HTTP.

```typescript
async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
  // controller.cron     → le pattern cron qui a déclenché l'exécution (ex: "* * * * *")
  // controller.scheduledTime → le timestamp Unix (en ms) de l'exécution planifiée

  const scheduledTime = new Date(controller.scheduledTime);
  console.log(`Cron déclenché à ${scheduledTime.toISOString()}`);

  // Ta logique ici...
}
```

### 3.3 `queue()` — Consumer de Queues

Ce handler traite les messages envoyés dans une **Cloudflare Queue**. Les messages arrivent par batch (lot).

```typescript
async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
  // batch.queue → nom de la queue (ex: "reachdem-email-queue")
  // batch.messages → tableau de messages à traiter

  for (const message of batch.messages) {
    try {
      const data = message.body; // le contenu du message
      // Traiter le message...
      message.ack();   // ✅ Succès → supprimer de la queue
    } catch (error) {
      message.retry(); // ❌ Échec → remettre dans la queue (ou DLQ après max_retries)
    }
  }
}
```

---

## 4. Cron Triggers (Schedulers)

### 4.1 Comment ça marche

Un **Cron Trigger** est un planning qui dit à Cloudflare : _"Exécute le handler `scheduled()` de mon Worker à tel intervalle"_.

```
┌───────────── minute (0-59)
│ ┌─────────── heure (0-23)
│ │ ┌───────── jour du mois (1-31)
│ │ │ ┌─────── mois (1-12)
│ │ │ │ ┌───── jour de la semaine (0-6, 0 = dimanche)
│ │ │ │ │
* * * * *
```

### 4.2 Exemples de cron patterns

| Pattern       | Signification                   |
| ------------- | ------------------------------- |
| `* * * * *`   | **Toutes les minutes**          |
| `*/2 * * * *` | Toutes les 2 minutes            |
| `*/5 * * * *` | Toutes les 5 minutes            |
| `0 * * * *`   | Toutes les heures (à minute 0)  |
| `0 9 * * *`   | Tous les jours à 9h00 UTC       |
| `0 9 * * 1-5` | Du lundi au vendredi à 9h00 UTC |
| `0 0 1 * *`   | Le 1er de chaque mois à minuit  |

### 4.3 Configuration dans wrangler.jsonc

```jsonc
{
  "triggers": {
    "crons": [
      "* * * * *", // Toutes les minutes
    ],
  },
}
```

> 📝 **Tu peux avoir plusieurs crons.** Cloudflare appellera le même handler `scheduled()` pour chacun, mais `controller.cron` te permet de distinguer lequel a été déclenché.

```jsonc
{
  "triggers": {
    "crons": [
      "* * * * *", // Vérifier les messages programmés
      "0 9 * * *", // Rapport quotidien
      "0 0 * * 0", // Nettoyage hebdomadaire
    ],
  },
}
```

```typescript
async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
  switch (controller.cron) {
    case "* * * * *":
      await checkScheduledMessages(env);
      break;
    case "0 9 * * *":
      await sendDailyReport(env);
      break;
    case "0 0 * * 0":
      await weeklyCleanup(env);
      break;
  }
}
```

### 4.4 Limites importantes

| Limite                         | Valeur                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| Nombre max de crons par Worker | 3                                                                   |
| Intervalle minimum             | 1 minute                                                            |
| Temps d'exécution max (CPU)    | 30 secondes                                                         |
| Précision                      | ±30 secondes (Cloudflare ne garantit pas l'exactitude à la seconde) |

### 4.5 Tester un cron en local

```bash
# Lancer le worker en local avec les crons simulés
npx wrangler dev --test-scheduled

# Déclencher manuellement le cron depuis un autre terminal
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

---

## 5. Cloudflare Queues

### 5.1 C'est quoi une Queue ?

Une Queue est un système de **file d'attente de messages**. Au lieu de traiter une tâche immédiatement (ce qui peut être lent ou échouer), tu places un **message** dans la queue, et un **consumer** le traite de manière asynchrone.

```
                    ┌──────────────┐
  API (fetch) ───▶  │    QUEUE     │ ───▶ Consumer (queue handler)
                    │ ┌──┐┌──┐┌──┐ │       │
                    │ │m3││m2││m1│ │       ├── Succès → message.ack()
                    │ └──┘└──┘└──┘ │       └── Échec  → message.retry()
                    └──────────────┘                      │
                                                          ▼ (après max_retries)
                                                   Dead Letter Queue (DLQ)
```

### 5.2 Pourquoi utiliser des Queues ?

1. **Découplage** — Le endpoint API répond immédiatement ("Email en attente"), le traitement se fait en arrière-plan
2. **Fiabilité** — Si l'envoi échoue, le message est re-tenté automatiquement
3. **Rate limiting** — Tu contrôles combien de messages sont traités simultanément (important pour les limites SMTP)
4. **Dead Letter Queue (DLQ)** — Après X échecs, le message va dans une queue séparée pour analyse/debug

### 5.3 Nos Queues

| Queue                  | Rôle           | DLQ                  |
| ---------------------- | -------------- | -------------------- |
| `reachdem-sms-queue`   | Envoi de SMS   | `reachdem-sms-dlq`   |
| `reachdem-email-queue` | Envoi d'emails | `reachdem-email-dlq` |

### 5.4 Configuration des consumers dans wrangler.jsonc

```jsonc
{
  "queues": {
    "producers": [
      {
        "binding": "EMAIL_QUEUE", // Nom accessible dans env.EMAIL_QUEUE
        "queue": "reachdem-email-queue", // Nom de la queue Cloudflare
      },
    ],
    "consumers": [
      {
        "queue": "reachdem-email-queue",
        "max_batch_size": 50, // Nombre max de messages par batch
        "max_batch_timeout": 2, // Secondes d'attente avant de traiter un batch incomplet
        "max_concurrency": 10, // Nombre max de batchs traités en parallèle
        "max_retries": 3, // Nombre de re-tentatives avant DLQ
        "dead_letter_queue": "reachdem-email-dlq",
      },
    ],
  },
}
```

### 5.5 Envoyer un message dans une Queue (Producer)

Depuis n'importe quel handler du Worker :

```typescript
// Depuis le handler fetch (API)
await env.EMAIL_QUEUE.send({
  to: "user@example.com",
  subject: "Bienvenue !",
  html: "<h1>Salut</h1>",
  contactId: "contact-123",
});

// Depuis le handler scheduled (cron) — cas d'usage de ReachDem
await env.EMAIL_QUEUE.send({
  to: scheduledMessage.recipientEmail,
  subject: scheduledMessage.subject,
  html: scheduledMessage.content,
  contactId: scheduledMessage.contactId,
  campaignId: scheduledMessage.campaignId,
  scheduledAt: scheduledMessage.scheduledAt,
});
```

### 5.6 Traiter un message (Consumer)

```typescript
async queue(batch: MessageBatch, env: Env) {
  for (const message of batch.messages) {
    const email = message.body;
    try {
      await sendEmail(email, env);
      message.ack();      // ✅ Supprimer de la queue
    } catch (error) {
      console.error(`Échec pour ${email.to}:`, error);
      message.retry();    // 🔄 Re-tenter (max 3 fois, puis → DLQ)
    }
  }
}
```

---

## 6. Configuration — wrangler.jsonc

Voici le fichier de configuration actuel, **annoté ligne par ligne** :

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json", // Autocomplétion IDE

  "name": "reachdem-worker", // Nom du worker sur Cloudflare
  "account_id": "76b1a7d0081890ccba80ea74cf5a9889", // ID du compte Cloudflare
  "main": "src/index.ts", // Point d'entrée du worker
  "compatibility_date": "2025-03-01", // Version des APIs Cloudflare à utiliser
  "compatibility_flags": ["nodejs_compat"], // Active les APIs Node.js (nécessaire pour nodemailer)
  "find_additional_modules": true, // Permet le bundling de packages npm

  // ─── Cron Triggers ─────────────────────────────────
  // ACTUELLEMENT DÉSACTIVÉ — Décommenter pour activer
  // "triggers": {
  //   "crons": [
  //     "*/2 * * * *"    // Toutes les 2 minutes
  //   ]
  // },

  // ─── Queues ────────────────────────────────────────
  "queues": {
    "producers": [
      { "binding": "SMS_QUEUE", "queue": "reachdem-sms-queue" },
      { "binding": "EMAIL_QUEUE", "queue": "reachdem-email-queue" },
    ],
    "consumers": [
      {
        "queue": "reachdem-sms-queue",
        "max_batch_size": 50,
        "max_batch_timeout": 2,
        "max_concurrency": 10,
        "max_retries": 3,
        "dead_letter_queue": "reachdem-sms-dlq",
      },
      {
        "queue": "reachdem-email-queue",
        "max_batch_size": 50,
        "max_batch_timeout": 2,
        "max_concurrency": 10,
        "max_retries": 3,
        "dead_letter_queue": "reachdem-email-dlq",
      },
    ],
  },

  // ─── Variables d'env (non-secrètes) ─────────────────
  "vars": {
    "ENVIRONMENT": "development", // Changer en "production" pour la prod
  },
}
```

---

## 7. Secrets et Variables d'environnement

### 7.1 La différence

| Type                   | Visibilité                            | Où les définir             | Exemple                   |
| ---------------------- | ------------------------------------- | -------------------------- | ------------------------- |
| **`vars`** (variables) | Visibles dans le code et le dashboard | `wrangler.jsonc`           | `ENVIRONMENT`             |
| **Secrets**            | Chiffrés, jamais affichés             | CLI ou dashboard           | `SMTP_PASSWORD`           |
| **`.dev.vars`**        | Dev local uniquement                  | Fichier local (gitignored) | Tous les secrets en local |

### 7.2 Secrets configurés

Les secrets suivants sont déjà configurés en production :

| Secret          | Valeur                             | Usage                |
| --------------- | ---------------------------------- | -------------------- |
| `SMTP_HOST`     | `smtpdm-eu-central-1.aliyuncs.com` | Serveur SMTP Alibaba |
| `SMTP_PORT`     | `465`                              | Port SSL             |
| `SMTP_USER`     | `messages@mail.rcdm.ink`           | Utilisateur SMTP     |
| `SMTP_PASSWORD` | `********`                         | Mot de passe SMTP    |
| `SMTP_SECURE`   | `true`                             | Connexion SSL        |
| `SENDER_EMAIL`  | `messages@mail.rcdm.ink`           | Adresse d'expéditeur |
| `SENDER_NAME`   | `ReachDem Notifications`           | Nom affiché          |

### 7.3 Commandes pour gérer les secrets

```bash
# Ajouter/modifier un secret
echo "ma_valeur" | npx wrangler secret put NOM_DU_SECRET

# Lister les secrets
npx wrangler secret list

# Supprimer un secret
npx wrangler secret delete NOM_DU_SECRET
```

### 7.4 Accès dans le code

Tous les secrets et variables sont accessibles via l'objet `env` :

```typescript
async fetch(request: Request, env: Env): Promise<Response> {
  console.log(env.ENVIRONMENT);   // "development"
  console.log(env.SMTP_HOST);     // "smtpdm-eu-central-1.aliyuncs.com"
}
```

Les types sont définis dans `src/types.ts` :

```typescript
export interface Env {
  SMS_QUEUE: Queue<SmsMessage>;
  EMAIL_QUEUE: Queue<EmailMessage>;
  ENVIRONMENT: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  // ... etc
}
```

---

## 8. Déploiement

### 8.1 Prérequis

- **Node.js** ≥ 18
- **pnpm** installé
- **Token API Cloudflare** configuré :

```bash
export CLOUDFLARE_API_TOKEN="ton_token_ici"
```

Pour rendre le token persistant :

```bash
echo 'export CLOUDFLARE_API_TOKEN="ton_token"' >> ~/.bashrc
source ~/.bashrc
```

### 8.2 Déployer

```bash
cd apps/workers

# Méthode 1 — via pnpm (script défini dans package.json)
pnpm deploy

# Méthode 2 — directement
npx wrangler deploy
```

### 8.3 Ce qui se passe au déploiement

1. **Compilation** — TypeScript → JavaScript
2. **Bundling** — Tout le code + dépendances en un seul fichier
3. **Upload** — Le bundle est envoyé à Cloudflare (~100 KiB gzippé)
4. **Activation** — Les triggers (HTTP, cron, queues) sont configurés
5. **Disponible** — Le worker est live en ~10 secondes

### 8.4 Développement local

```bash
cd apps/workers

# Lancer le worker en local (utilise .dev.vars pour les secrets)
npx wrangler dev

# Avec simulation des crons
npx wrangler dev --test-scheduled
```

Le worker sera accessible sur `http://localhost:8787`.

---

## 9. Commandes utiles

```bash
# ─── Authentification ────────────────────────────────
npx wrangler whoami                     # Vérifier le compte connecté

# ─── Déploiement ────────────────────────────────────
npx wrangler deploy                     # Déployer
npx wrangler deployments list           # Lister les déploiements
npx wrangler rollback                   # Revenir à la version précédente

# ─── Logs en temps réel ─────────────────────────────
npx wrangler tail                       # Suivre les logs (JSON)
npx wrangler tail --format pretty       # Suivre les logs (lisible)

# ─── Développement local ────────────────────────────
npx wrangler dev                        # Lancer en local
npx wrangler dev --test-scheduled       # Avec simulation cron

# ─── Queues ──────────────────────────────────────────
npx wrangler queues list                # Lister les queues
npx wrangler queues create NOM          # Créer une queue
npx wrangler queues delete NOM          # Supprimer une queue

# ─── Secrets ─────────────────────────────────────────
npx wrangler secret list                # Lister les secrets
npx wrangler secret put NOM             # Ajouter un secret
npx wrangler secret delete NOM          # Supprimer un secret

# ─── Types ───────────────────────────────────────────
npx wrangler types                      # Regénérer worker-configuration.d.ts
```

---

## 10. Implémentation cible — Vérification des messages programmés

### 10.1 Le besoin

Le cron doit tourner **toutes les minutes** pour vérifier si des messages (emails/SMS) ont été **programmés pour l'heure actuelle** dans la base de données, et les mettre en queue pour envoi.

### 10.2 Flux de données

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                        Toutes les minutes (Cron)                           │
  │                                                                            │
  │    scheduled()                                                             │
  │        │                                                                   │
  │        ▼                                                                   │
  │    Appeler l'API backend ──▶ GET /api/messages/scheduled?until=now         │
  │        │                          │                                        │
  │        │                          ▼                                        │
  │        │                    Base de données                                │
  │        │                    (Messages où scheduledAt ≤ maintenant          │
  │        │                     ET status = "pending")                        │
  │        │                          │                                        │
  │        ▼                          ▼                                        │
  │    Réponse : [{to, subject, html, contactId, ...}, ...]                   │
  │        │                                                                   │
  │        ├── Email ? ──▶ env.EMAIL_QUEUE.send(message)                      │
  │        └── SMS ?   ──▶ env.SMS_QUEUE.send(message)                        │
  │                                                                            │
  │    Puis : marquer les messages comme "queued" en BDD                      │
  │           PATCH /api/messages/status { ids: [...], status: "queued" }      │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                        Queue Consumer (asynchrone)                         │
  │                                                                            │
  │    queue() handler                                                         │
  │        │                                                                   │
  │        ├── reachdem-email-queue ──▶ Envoie l'email via SMTP (nodemailer)   │
  │        │       │                                                           │
  │        │       ├── ✅ Succès → message.ack() → PATCH status = "sent"       │
  │        │       └── ❌ Échec  → message.retry() (max 3×, puis → DLQ)       │
  │        │                                                                   │
  │        └── reachdem-sms-queue ──▶ Envoie le SMS via Twilio (ou autre)     │
  │                │                                                           │
  │                ├── ✅ Succès → message.ack() → PATCH status = "sent"       │
  │                └── ❌ Échec  → message.retry() (max 3×, puis → DLQ)       │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Squelette d'implémentation pour `scheduled.ts`

```typescript
import type { Env, EmailMessage, SmsMessage } from "./types";

const API_BASE_URL = "https://ton-api.reachdem.com"; // ou env.API_URL

export async function handleScheduled(
  controller: ScheduledController,
  env: Env
): Promise<void> {
  const now = new Date(controller.scheduledTime);
  console.log(
    `[Cron] Vérification des messages programmés à ${now.toISOString()}`
  );

  try {
    // ── Étape 1 : Récupérer les messages à envoyer ───────────────
    const response = await fetch(
      `${API_BASE_URL}/api/messages/scheduled?until=${now.toISOString()}`
    );

    if (!response.ok) {
      console.error(`[Cron] API error: ${response.status}`);
      return;
    }

    const messages = (await response.json()) as ScheduledMessage[];
    console.log(`[Cron] ${messages.length} message(s) à envoyer`);

    if (messages.length === 0) {
      return; // Rien à faire
    }

    // ── Étape 2 : Envoyer dans les queues ────────────────────────
    const queuedIds: string[] = [];

    for (const msg of messages) {
      if (msg.type === "email") {
        await env.EMAIL_QUEUE.send({
          to: msg.recipientEmail,
          subject: msg.subject,
          html: msg.content,
          contactId: msg.contactId,
          campaignId: msg.campaignId,
          scheduledAt: msg.scheduledAt,
        } satisfies EmailMessage);
      } else if (msg.type === "sms") {
        await env.SMS_QUEUE.send({
          to: msg.recipientPhone,
          body: msg.content,
          contactId: msg.contactId,
          campaignId: msg.campaignId,
          scheduledAt: msg.scheduledAt,
        } satisfies SmsMessage);
      }

      queuedIds.push(msg.id);
    }

    // ── Étape 3 : Marquer comme "queued" en BDD ─────────────────
    await fetch(`${API_BASE_URL}/api/messages/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: queuedIds, status: "queued" }),
    });

    console.log(`[Cron] ✓ ${queuedIds.length} message(s) mis en queue`);
  } catch (error) {
    console.error("[Cron] Erreur :", error);
  }
}

// Type pour les messages récupérés depuis l'API
interface ScheduledMessage {
  id: string;
  type: "email" | "sms";
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  content: string;
  contactId: string;
  campaignId?: string;
  scheduledAt: string;
}
```

### 10.4 Activation du cron

Quand l'implémentation est prête, décommenter dans `wrangler.jsonc` :

```jsonc
{
  "triggers": {
    "crons": [
      "* * * * *", // ← Toutes les minutes
    ],
  },
}
```

Puis redéployer :

```bash
npx wrangler deploy
```

### 10.5 Checklist d'implémentation

- [ ] Créer l'endpoint API `GET /api/messages/scheduled?until=...`
- [ ] Créer l'endpoint API `PATCH /api/messages/status`
- [ ] Implémenter la logique dans `scheduled.ts`
- [ ] Ajouter `API_URL` comme secret ou variable d'env
- [ ] Ajouter un token d'authentification pour sécuriser les appels API depuis le Worker
- [ ] Décommenter le cron dans `wrangler.jsonc`
- [ ] Déployer et tester avec `npx wrangler tail --format pretty`
- [ ] Vérifier les DLQ pour les messages en échec

---

## Ressources

- [📘 Documentation officielle Workers](https://developers.cloudflare.com/workers/)
- [📘 Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [📘 Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [📘 Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [📘 Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [🔧 Crontab Guru (testeur de cron)](https://crontab.guru/)
