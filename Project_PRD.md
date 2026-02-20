# ReachDem — Product Requirements Document (PRD)

> Version: 1.0  
> Last updated: 2026-02-19  
> Owner: Product (ReachDem)  
> Scope: Plateforme B2B2C de communication multicanale (SMS / Email / WhatsApp), segmentation, tracking via URL shortener, Link Profiles + cartes RFID/NFC, APIs & webhooks, et une couche IA (assistive puis prédictive).

---

## 0) Résumé exécutif

**ReachDem** est une plateforme **B2B2C** qui permet aux entreprises d’envoyer des messages à leurs clients via **SMS, Email et WhatsApp**, de gérer **contacts / groupes / segments**, d’utiliser un **raccourcisseur d’URL traçable**, et de publier des **Link Profiles (Link by ReachDem)** connectés à des **cartes de visite RFID/NFC**.

Objectif: devenir un **Marketing Operating System** simple, fiable et mesurable pour les SMB/PME (Afrique & global).

---

## 1) Problème & opportunité

### Problèmes côté entreprises
- Multicanal fragmenté : outils séparés pour SMS/email/WhatsApp, peu de cohérence.
- Segmentation difficile (données dispersées, import pénible, peu d’automations).
- Mesure faible : clics, conversions et ROI des campagnes difficiles à attribuer.
- Manque d’outillage “dev-friendly” : APIs, webhooks, intégrations simples.

### Problèmes côté indépendants/professionnels
- Partage de contacts/présence digitale non unifiée (liens, réseaux, offres).
- Carte de visite papier inefficace (pas de tracking, pas de mise à jour dynamique).

### Opportunité
Construire une plateforme unique, orientée **simplicité + ROI**, avec :
- **Messagerie multicanale + segmentation + tracking**,
- un **Link Profile** traçable,
- une base “data” pour ajouter une couche IA (personnalisation & prédiction).

---

## 2) Vision produit

> Permettre à chaque entreprise de communiquer efficacement avec ses clients, de façon multicanale, mesurable et automatisée — sans complexité.

---

## 3) Objectifs (Goals) & Non-objectifs (Non-goals)

### Goals (0–3 mois, mode startup)
1. Envoyer des campagnes et messages transactionnels sur **SMS/Email/WhatsApp** depuis une seule plateforme.
2. Gérer **contacts, attributs, segments dynamiques** et consentements.
3. Offrir un **URL shortener** natif traçable + dashboards (clics, conversions, ROI).
4. Déployer **Link by ReachDem** + association RFID/NFC + analytics.
5. Exposer des **APIs + webhooks** stables pour intégrations.
6. Lancer une **v1 IA** : suggestion de contenu + insights simples (anomalies, prédictions légères).

### Non-goals (v1)
- CRM complet (pipeline sales, devis, facturation) → privilégier intégrations.
- Réseau social / communauté.
- Marketplace d’influenceurs (plus tard).

---

## 4) Personas & besoins

1. **Responsable marketing SMB**
   - Besoin : envoyer des promos, relancer, mesurer le ROI, segmenter vite.
2. **Opérations / Service client**
   - Besoin : confirmations, rappels, notifications fiables + templates.
3. **Développeur / CTO d’une PME**
   - Besoin : APIs, webhooks, logs, idempotence, quotas, docs claires.
4. **Indépendant / consultant / entrepreneur**
   - Besoin : Link Profile pro + carte RFID/NFC + tracking.
5. **Admin / Finance**
   - Besoin : facturation, quotas, permissions, audit.

---

## 5) Cas d’usage (Use cases)

### UC1 — Campagne promotionnelle
Import contacts → segment “clients actifs” → création campagne → envoi multi-canal → tracking clics & conversions.

### UC2 — Message transactionnel
Via API : “commande confirmée” / “rdv demain 10h” → statut livré/échoué → retry → webhook.

### UC3 — Relance automatique
Segment “a cliqué mais n’a pas acheté” → relance J+1 via WhatsApp ou Email.

### UC4 — Link Profile & carte RFID
Un pro crée son profil → associe sa carte → partage → analytics (vues, clics, leads).

### UC5 — Attribution via liens
Un lien ReachDem dans un SMS → tableau de bord : clics, sources, appareils, conversions (si pixel/UTM/évènements).

---

## 6) Périmètre fonctionnel (Modules)

### A) Comptes, organisations, rôles
**Fonctionnel**
- Auth unifiée (email/password + OAuth optionnel).
- Organisations (workspaces) + multi-projets.
- Rôles : Owner, Admin, Marketer, Analyst, Developer, Support (custom plus tard).
- Gestion des membres, invitations, révocation, audit.

**Critères d’acceptation**
- Un utilisateur peut appartenir à plusieurs organisations.
- Un Owner peut définir permissions par rôle.

---

### B) Contacts, attributs, consentements
**Fonctionnel**
- CRUD contacts : téléphone, email, nom, tags, attributs custom (key/value).
- Import CSV + mapping colonnes + déduplication (email/téléphone).
- Champs système (createdAt, source, lastSeen, etc.).
- Consentements par canal (opt-in/opt-out), gestion “STOP” SMS et équivalents.
- Historique d’activité d’un contact (messages reçus, clics, events).

**Critères d’acceptation**
- Import 10k contacts sans crash, avec rapport d’erreurs.
- Déduplication configurable (strict / permissive).

---

### C) Segmentation & audiences
**Fonctionnel**
- Segments statiques (liste figée) et dynamiques (règles).
- Règles : attributs, tags, activité (a cliqué X), date (lastMessage >), etc.
- Estimation taille du segment + preview.

**Critères d’acceptation**
- Une règle dynamique se recalcul(e) automatiquement (batch ou quasi temps réel).
- Preview affiche un échantillon de contacts.

---

### D) Messagerie multicanale (SMS / Email / WhatsApp)
**Fonctionnel**
- Composer : contenu, variables (ex: `{{first_name}}`), emojis, liens trackés.
- Templates : sauvegarde, versioning, dossiers, tags.
- Support 2 types :
  1) **Campagnes** (bulk) : planification, time window, A/B simple.
  2) **Transactionnel** (API) : faible latence, idempotence.
- Connecteurs fournisseurs (abstraction) :
  - SMS provider(s)
  - Email provider(s)
  - WhatsApp Business provider(s) / API
- Statuts normalisés : queued, sent, delivered, failed, read (si dispo), clicked (via liens).
- Retry + backoff + dead-letter.
- Anti-spam : quotas, limites par org, throttling.

**Critères d’acceptation**
- Une campagne peut être programmée (date/heure + fuseau).
- Le système conserve les logs de délivrabilité.

---

### E) URL Shortener & tracking (rcdm.ink / domains)
**Fonctionnel**
- Création de liens courts : slug auto ou custom.
- Paramètres UTM + tags campagne.
- Redirection rapide (faible latence).
- Analytics : clics, uniques, géos (approx), device, referrer, timestamp.
- Domaines custom + SSL.
- Anti-abus : détection de spam/blacklist + expiration de liens.

**Critères d’acceptation**
- Un lien tracké peut être injecté automatiquement dans une campagne.
- Dashboard clics par lien + par campagne.

---

### F) Link by ReachDem (Link Profile)
**Fonctionnel**
- Création de pages profil : photo, bio, boutons, réseaux, services, CTA (WhatsApp, appel, formulaire).
- Thèmes / personnalisation (couleurs, sections).
- Analytics : vues, clics par bouton, conversions (form submit).
- QR Code auto + URL publique.
- Gestion multi-profils (pro / marque / événement).

**Critères d’acceptation**
- Une page se charge vite sur mobile (objectif <2s sur 3G si possible).
- Un bouton peut déclencher un event tracké.

---

### G) RFID/NFC business cards
**Fonctionnel**
- Association carte ↔ profil.
- Gestion inventory (cartes) + statut (active, lost, reassigned).
- “Tap” tracking (évènement distinct des clics).
- Possibilité de changer le profil lié sans reprogrammer la carte (URL stable).

**Critères d’acceptation**
- Une carte peut être réassignée par un Admin avec historique.

---

### H) Analytics & reporting
**Dashboards**
- Global : messages envoyés, délivrés, coût estimé, CTR, taux d’ouverture (email si dispo), taux de réponse (si dispo).
- Par campagne : performance par canal, heatmap horaires, top liens.
- Par segment : performance et évolution.
- Pour Link Profile : vues, taps, clics, top CTA.

**Exports**
- CSV export pour campagnes, liens, contacts.

**Critères d’acceptation**
- Toute métrique doit être traçable à une source (campagne, lien, segment).

---

### I) Developer Platform (API + Webhooks)
**API**
- Auth par API keys (scopes).
- Endpoints (exemples) :
  - `/contacts` (CRUD, import async)
  - `/segments` (CRUD, evaluate)
  - `/messages/send` (transactionnel)
  - `/campaigns` (create/schedule)
  - `/links` (shorten, stats)
  - `/webhooks` (register)
- Idempotence keys pour send transactionnel.
- Rate limits par org + logs.

**Webhooks**
- `message.status` (sent/delivered/failed)
- `link.clicked`
- `profile.viewed` / `profile.tapped`
- `contact.updated` (optionnel)

**Critères d’acceptation**
- Docs + exemples curl + SDK (JS) au minimum.
- Webhook signé (HMAC) + retry.

---

### J) Couche IA (v1 → v2)
**v1 (assistive)**
- Suggestions de textes marketing + variations (court, pro, fun).
- Réécriture selon cible (segment) : ton, langue, longueur.
- Suggestions de CTA + objets email.
- Alerte anomalie simple : “baisse brutale de CTR”, “hausse d’échecs”.

**v2 (prédictif)**
- Prédire CTR/conversions par campagne avant envoi (avec incertitude).
- Send-time optimization (meilleur horaire).
- Segmentation intelligente (clusters basés sur activité).

**Critères d’acceptation**
- L’IA ne doit jamais envoyer automatiquement sans validation humaine (v1).
- Journalisation des prompts + garde-fous (PII, conformité).

---

## 7) Exigences non-fonctionnelles (NFR)

### Performance & scalabilité
- Envoi bulk : support 100k messages/campagne (par batch, v2) ; MVP : 10k.
- Latence transactionnelle : objectif p95 < 2s hors provider.
- Raccourcisseur : redirection rapide (objectif p95 < 200ms si possible).

### Disponibilité
- Objectif MVP : 99.5% ; v2 : 99.9% (hors providers externes).

### Sécurité
- Chiffrement en transit (TLS) + chiffrement au repos (DB).
- RBAC + journaux d’audit.
- Protection anti-abus (rate limit, WAF si besoin).
- Webhooks signés.

### Confidentialité & conformité
- Consentements par canal.
- Export/suppression contact (droit à l’oubli).
- Conservation des logs configurable.

### Qualité
- Observabilité : logs, métriques, traces, alerting.
- Tests : unit, intégration, E2E sur flux critiques.

### Internationalisation
- FR/EN (v1), multi-fuseaux horaires.

---

## 8) Modèle de données (conceptuel)

- Organization
- User (memberships)
- Role/Permission
- Contact (attributes, consent)
- Segment (rules)
- Template
- Campaign (channel(s), schedule, segment, content)
- Message (par contact, par channel, statuses)
- Link (slug, destination, tags, campaignId)
- ClickEvent
- Profile (Link Profile)
- TapEvent (RFID/NFC)
- WebhookEndpoint
- BillingPlan / Usage (quotas)

---

## 9) Parcours clés (workflows)

### Workflow 1 — Créer une campagne
1. Choisir canal → template → segment
2. Prévisualiser variables / liens trackés
3. Définir planning + fenêtre d’envoi + limites
4. Lancer → suivre dashboard temps réel → exporter résultats

### Workflow 2 — Transactionnel via API
1. App envoie `/messages/send` (idempotence key)
2. ReachDem met en queue, envoie au provider
3. Provider callback → ReachDem → statut mis à jour
4. ReachDem notifie le client via webhook signé

### Workflow 3 — Link Profile + carte
1. Création profile → config CTA
2. Association carte (ID unique)
3. Tap → ouvre URL stable → log event → analytics

---

## 10) Mesure de succès (KPIs)

### Activation & adoption
- % d’orgs qui importent ≥ 500 contacts en 7 jours
- % d’orgs qui envoient 1ère campagne en 7 jours
- Taux d’usage API (orgs actives API / total)

### Performance produit
- Delivery rate (SMS/WhatsApp/Email)
- CTR moyen par canal
- Taux d’échec provider
- Temps moyen de création campagne

### Business
- ARPA / MRR
- Churn mensuel
- Coût de délivrance vs marge

### Link Profile
- Vues / taps / clics par profil
- % de profils actifs (≥ 1 event / semaine)

---

## 11) Permissions (RBAC) — proposition
- Owner : tout + billing + clés API + sécurité
- Admin : tout sauf paiement
- Marketer : campagnes, templates, segments, dashboards
- Analyst : dashboards + export
- Developer : API keys, webhooks, logs techniques
- Support : lecture + assistance (optionnel)

---

## 12) Roadmap — “Startup speed” (timeboxes courts)

> Hypothèse: équipe petite mais focus, livraison hebdomadaire, “thin slices” et validation client en continu.  
> Format recommandé: sprints de **1 semaine** (ou 2 semaines max si nécessaire).

### Sprint 1 (S1) — Foundation (1 semaine)
**Livrables**
- Auth + Organisation (workspace) + roles minimum (Owner/Admin)
- Contacts CRUD (UI simple)
- Shortener v0 (création lien + redirect)
- Logs basiques + monitoring minimal

**Definition of Done**
- Un user crée une org, ajoute 1 contact, crée un lien, le lien redirige et log un clic.

---

### Sprint 2 (S2) — SMS Campaign v1 (1 semaine)
**Livrables**
- Import CSV (v1) + dédup simple
- Campagne SMS “send now” sur segment statique
- Statuts normalisés (queued/sent/failed) + page de résultats
- Quotas & rate limit simples

**DoD**
- Envoi de 1k SMS, affichage des statuts, tracking lien SMS.

---

### Sprint 3 (S3) — Tracking & Analytics v1 (1 semaine)
**Livrables**
- Dashboard liens (clics/uniques/time)
- UTM + tags de campagne
- Auto-injection de lien tracké dans le composer
- Exports CSV (liens + résultats campagne)

**DoD**
- Campagne → lien tracké → dashboard cohérent + export.

---

### Sprint 4 (S4) — Transactionnel API + Webhooks (1 semaine)
**Livrables**
- Endpoint `/messages/send` (SMS) + idempotence
- Webhook `message.status` signé (HMAC) + retry
- API keys + scopes minimal (send/read)

**DoD**
- Une app externe peut envoyer un SMS et recevoir la confirmation via webhook.

---

### Sprint 5 (S5) — Email v1 + Templates (1 semaine)
**Livrables**
- Connecteur Email (envoi simple)
- Templates (create/save) + variables `{{ }}` + preview
- Campaign Email “send now” sur segment statique
- Stats basiques (sent/failed, open si provider)

**DoD**
- Même campagne, choix SMS ou Email, templates réutilisables.

---

### Sprint 6 (S6) — Segments dynamiques v1 + Scheduling (1 semaine)
**Livrables**
- Segments dynamiques (règles attributs + tags)
- Planification campagne (date/heure + fuseau)
- Fenêtre d’envoi (limiter en journée)

**DoD**
- Segment dynamique se met à jour, campagne planifiée part à l’heure.

---

### Sprint 7 (S7) — WhatsApp v1 (1 semaine)
**Livrables**
- Connecteur WhatsApp (templates conformes provider)
- Statuts enrichis (delivered/read si dispo)
- Composer WhatsApp + gestion opt-in canal

**DoD**
- Envoi WhatsApp template à un segment + statuts visibles.

---

### Sprint 8 (S8) — Link by ReachDem v1 (1 semaine)
**Livrables**
- Création Link Profile (bio + boutons + CTA)
- QR code + page publique mobile-first
- Analytics (views/clicks par bouton)

**DoD**
- Un profil public tracke des clics et s’affiche correctement sur mobile.

---

### Sprint 9 (S9) — Automations v1 + Domaines custom (1 semaine)
**Livrables**
- Automation “J+1 relance si clic” (règle simple)
- Domaines custom (v1) + SSL (si possible via provider)
- Anti-abus shortener (règles basiques)

**DoD**
- Une relance automatique fonctionne sur un scénario simple.

---

### Sprint 10 (S10) — RFID/NFC v1 (1 semaine)
**Livrables**
- Associer carte ↔ profil (URL stable)
- Events “tap” + analytics
- Réassignation carte + historique

**DoD**
- Tap → ouverture profil + event tracké.

---

### Sprint 11 (S11) — IA assistive v1 (1 semaine)
**Livrables**
- Suggestions de texte (variantes) dans le composer
- Suggestions CTA/objet email
- Alertes anomalies simples (CTR/échecs)

**DoD**
- L’IA aide à écrire mais ne déclenche aucun envoi.

---

### Sprint 12 (S12) — Hardening & Scale basics (1 semaine)
**Livrables**
- Observabilité solide (dash erreurs providers, DLQ)
- RBAC complet + audit log
- Optimisations perf (queues/batching)
- Stabilisation & docs API

**DoD**
- SLO internes atteints sur tests charge MVP.

---

## 13) Dépendances & risques

### Dépendances
- Fournisseurs SMS/Email/WhatsApp
- Politiques anti-spam et conformité
- Infrastructure scalable (queue, DB, observabilité)

### Risques principaux
- Deliverability & blocages opérateurs
- Fraude/spam via URL shortener
- Coûts variables (SMS/WhatsApp)
- Qualité des données (consentements non gérés)

**Mitigations**
- Quotas par plan, validation/KYC “light” au-dessus d’un seuil
- Détection d’abus + blocage domaines/URLs
- Consentement robuste + opt-out standard
- Monitoring & alerting (échecs, spikes, anomalies)

---

## 14) Critères “Go/No-Go” (release MVP)
- Envoi stable sur au moins 2 canaux (SMS + Email ou WhatsApp).
- Segments dynamiques fonctionnels.
- Tracking liens fiable (clics/uniques).
- API transactionnelle + webhooks signés.
- Dashboard campagne lisible + exports.
- RBAC minimum + audit.

---

## 15) Questions ouvertes (à trancher vite)
1. Quels providers prioritaires (SMS/Email/WhatsApp) selon pays cible ?
2. Modèle de pricing : par message, par contact, par features, hybride ?
3. Politique de rétention des logs (90j/180j/1an) ?
4. Link by ReachDem : gratuit (funnel) ou inclus dans plans ?
5. Niveau de personnalisation UI (thèmes) pour Link Profile en v1 ?

---

### Annexe 
- Livrer des tranches fines utilisables chaque semaine.
- Mesurer dès le Sprint 2 (tracking) → éviter “feature sans data”.
- Toujours 1 boucle feedback (5 clients pilotes) par sprint.
- Priorité absolue à: deliverability, tracking fiable, et onboarding simple.