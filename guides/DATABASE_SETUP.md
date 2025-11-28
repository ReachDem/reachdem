# Configuration de la Base de Données

Le package database avec Prisma a été configuré avec succès ! 🎉

## ✅ Ce qui a été fait

1. **Structure du package** créée dans `packages/database/`
2. **Schéma Prisma** configuré avec les modèles Better-Auth:
   - `User` - Utilisateurs
   - `Account` - Comptes OAuth
   - `Session` - Sessions d'authentification
   - `VerificationToken` - Tokens de vérification email
3. **Client Prisma** généré et prêt à l'emploi
4. **Monorepo** configuré avec pnpm workspaces
5. **Scripts** ajoutés au package.json racine

## 📋 Prochaines étapes

### 1. Configurer la base de données

Créez un fichier `.env` à la racine du projet avec votre URL de base de données:

**Pour PostgreSQL (recommandé):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/reachdem?schema=public"
```

**Pour SQLite (développement local):**
```env
DATABASE_URL="file:./dev.db"
```

### 2. Synchroniser le schéma avec la base de données

```bash
# Depuis la racine du projet
pnpm db:push
```

Ou pour créer une migration (production):
```bash
pnpm db:migrate
```

### 3. Visualiser la base de données (optionnel)

```bash
pnpm db:studio
```

Cela ouvrira Prisma Studio dans votre navigateur pour visualiser et éditer vos données.

## 🔧 Commandes disponibles

- `pnpm db:generate` - Génère le client Prisma
- `pnpm db:push` - Synchronise le schéma avec la DB (dev)
- `pnpm db:migrate` - Crée et applique une migration
- `pnpm db:studio` - Ouvre Prisma Studio

## 📦 Utilisation dans votre code

```typescript
import { prisma } from '@reachdem/database'

// Exemple: récupérer tous les utilisateurs
const users = await prisma.user.findMany()

// Exemple: créer un utilisateur
const newUser = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe'
  }
})
```

## 🔐 Prochaine étape: Better-Auth

Maintenant que la base de données est configurée, nous pouvons passer à l'intégration de Better-Auth pour l'authentification !
