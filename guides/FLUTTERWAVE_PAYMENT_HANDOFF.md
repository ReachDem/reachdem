# Payment API Spec (Handoff)

## Objectif unique
Produire une API paiement unique qui:
- s’integre avec les futurs produits sans rework
- choisit automatiquement le mode de paiement selon la localisation:
  - **CEMAC** => **Mobile Money**
  - **Hors CEMAC** => **Carte bancaire**

## Regle metier de localisation
- Pays CEMAC:
  - `CM`, `GA`, `GQ`, `TD`, `CF`, `CG`
- Si `country` appartient a cette liste:
  - route de paiement = `mobile_money`
- Sinon:
  - route de paiement = `card`

## Contrat API attendu

### 1) Create Payment Intent
`POST /api/payments/intents`

Body minimal:
- `product_id` (string)
- `amount` (number)
- `currency` (string)
- `customer`:
  - `first_name`
  - `last_name`
  - `email`
  - `phone_number`
  - `country` (ISO-2, ex: `CM`, `FR`, `US`)

Reponse:
- `intent_id`
- `payment_route` (`mobile_money` | `card`)
- `next_action`
- `metadata`

### 2) Init Payment Method (si mobile_money)
`POST /api/payments/intents/:intent_id/init`

Body:
- `network` (`mtn` | `orange`) pour CEMAC
- `country_dial_code` (ex: `237`)

Reponse:
- `customer_id`
- `payment_method_id`
- `status`

### 3) Charge
`POST /api/payments/intents/:intent_id/charge`

Reponse:
- `provider_reference`
- `tx_ref`
- `status` (`pending` | `success` | `failed`)
- `requires_action` (boolean)

### 4) Verify
`GET /api/payments/intents/:intent_id/verify`

Reponse:
- `status` final
- `provider_payload`
- `reconciled` (boolean)

### 5) Webhook
`POST /api/payments/webhooks/flutterwave`

Fonctions:
- verifier signature
- update status intent/transaction
- idempotence stricte

## Architecture attendue
- Service unique: `PaymentOrchestrator`
  - `resolveRoute(country)` => `mobile_money` or `card`
  - `createIntent(...)`
  - `init(...)`
  - `charge(...)`
  - `verify(...)`
- Adapters provider:
  - `FlutterwaveCardAdapter`
  - `FlutterwaveMobileMoneyAdapter`
- Schema DB minimal:
  - `payment_intents`
  - `payment_transactions`
  - `payment_events` (webhooks/audit)

## Exigences non-negociables
- Pas de secret provider expose au frontend
- `tx_ref` + `reference` uniques
- Idempotency key sur endpoints critiques
- Verification serveur obligatoire avant “paiement reussi”
- Logs techniques + correlation id
- Retry controlle sur erreurs transientes

## Donnees de configuration
- CEMAC countries configurable (env ou table config)
- Mapping reseaux par pays (ex: CEMAC => `mtn`, `orange`)
- Feature flags:
  - `ENABLE_CARD`
  - `ENABLE_MOMO`
  - `FORCE_ROUTE` (debug)

## Livrables attendus du dev
1. API unifiee `intents/init/charge/verify/webhook`
2. Routage localisation auto (CEMAC vs hors CEMAC)
3. Tests:
   - unitaires route resolver
   - integration init/charge/verify
   - webhook idempotence
4. Doc technique:
   - payloads
   - statuts
   - erreurs
   - exemples par pays

## Critere d’acceptation
- `country=CM` => route `mobile_money` automatiquement
- `country=FR` (ou US/UK/etc.) => route `card` automatiquement
- Aucun endpoint frontend ne contient `client_secret`
- Un paiement n’est “success” qu’apres verification serveur/webhook

## References Flutterwave
- Auth: https://developer.flutterwave.com/docs/authentication
- Main flow: https://developer.flutterwave.com/v4.0/docs/main-payment-flow
- Best practices: https://developer.flutterwave.com/docs/best-practices
