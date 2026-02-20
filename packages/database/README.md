# Database Package

Package Prisma partagé pour le monorepo ReachDem.

## Installation

```bash
pnpm install
```

## Génération du client Prisma

```bash
pnpm db:generate
```

## Commandes disponibles

- `pnpm db:generate` - Génère le client Prisma
- `pnpm db:push` - Synchronise le schéma avec la base de données (dev)
- `pnpm db:migrate` - Crée et applique une migration
- `pnpm db:studio` - Ouvre Prisma Studio pour visualiser les données

## Configuration

Créez un fichier `.env` à la racine du monorepo avec:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/reachdem?schema=public"
```

## Utilisation dans d'autres packages

```typescript
import { prisma } from '@reachdem/database'

const users = await prisma.user.findMany()
```
