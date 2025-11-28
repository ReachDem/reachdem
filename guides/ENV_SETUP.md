# Configuration des Variables d'Environnement - Monorepo

## 📍 Emplacement Centralisé

Toutes les variables d'environnement sont maintenant gérées dans **un seul fichier** à la racine du monorepo :

```
reachdem/
└── .env          ← Fichier unique pour tout le monorepo
```

## 🔧 Configuration

### 1. Créer le fichier `.env`

Copiez `.env.example` vers `.env` à la racine :

```bash
cp .env.example .env
```

### 2. Remplir les variables

Éditez `reachdem/.env` avec vos valeurs :

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host/database

# Better Auth Configuration
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## ✅ Comment ça fonctionne

### Package Database (`packages/database`)

Les scripts Prisma chargent automatiquement `../../.env` :

```bash
pnpm db:push      # Utilise .env à la racine
pnpm db:generate  # Utilise .env à la racine
pnpm db:studio    # Utilise .env à la racine
```

### Application Web (`apps/web`)

Next.js charge automatiquement `../../.env` via `next.config.ts`.

Aucune configuration supplémentaire nécessaire !

## 🚫 Fichiers à supprimer

Vous pouvez maintenant **supprimer** ces fichiers (ils ne sont plus utilisés) :

- `apps/web/.env.local`
- `packages/database/.env.local`

## 🔒 Sécurité

Le fichier `.env` est automatiquement ignoré par Git (via `.gitignore`).

**Ne commitez JAMAIS ce fichier !**

## 📝 Générer un secret

Pour `BETTER_AUTH_SECRET`, utilisez :

```bash
openssl rand -base64 32
```
