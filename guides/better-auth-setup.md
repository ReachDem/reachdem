# Better Auth Setup Guide (ReachDem + Links)

This repository is now configured with a shared **Better Auth** SSO system across two apps:

1. **ReachDem** (`apps/web` on `http://localhost:3000`)
2. **Links** (`apps/links` on `http://localhost:3001`)

Both apps use the same database, same session cookies, and share a central authentication configuration located in `packages/auth`.

---

## 1. Environment Variables

Make sure the following environment variables are set in your root `.env` or `apps/web/.env`:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth Secrets & URLs
BETTER_AUTH_SECRET="your-32-char-random-string"
BETTER_AUTH_URL="http://localhost:3000"

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_LINKS_URL="http://localhost:3001"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### Note on Cookies

Cross-subdomain cookies are enabled. In production, you must set `AUTH_COOKIE_DOMAIN=".reachdem.cc"` to ensure cookies are shared across `app.reachdem.cc` and `links.reachdem.cc` (the dot prefix is strictly required).

---

## 2. Running Local Development

You can run both apps simultaneously using the new `dev:all` script from the root:

```sh
pnpm dev:all
```

Or individually:

```sh
pnpm dev         # Runs ReachDem on 3000
pnpm dev:links   # Runs Links on 3001
```

---

## 3. Database Migrations

The central Prisma schema is located at `packages/database/prisma/schema.prisma`. All changes to models should be made here.

To sync the database:

```sh
pnpm db:push
# or
pnpm db:migrate
```

To view data:

```sh
pnpm db:studio
```

---

## 4. Organization Workflow & RBAC

The system uses Better Auth's **Organization Plugin** with custom permissions.

### Auto-creation

When a user signs up, the system automatically creates a "Personal Workspace" and sets them as the "owner". When they sign in, this organization is automatically set as their active session organization.

### Server-side Protection Examples

You can protect your Next.js route handlers or Server Actions using the built-in helpers exported from `@reachdem/auth`:

```typescript
import {
  requireAuth,
  requireOrgMembership,
  requireRole,
  requireOwner,
} from "@reachdem/auth";

export async function POST(req: Request) {
  // 1. Just require authentication (returns session + user)
  const { session } = await requireAuth();

  // 2. Require the user to have an active organization selected
  const { session, member } = await requireOrgMembership();

  // 3. Require a specific role in the active organization
  const { session, member } = await requireRole(["admin", "owner"]);

  // 4. Require 'owner' role explicitly
  const { session, member } = await requireOwner();
}
```

### Client-side Protection

Use the `useSession` and `useActiveOrganization` hooks provided by `@reachdem/auth/client`:

```tsx
"use client";
import { useSession } from "@reachdem/auth/client";
import { authClient } from "@reachdem/auth/client";

export default function Page() {
  const { data: session } = useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();

  // ...
}
```

---

## 5. End-to-End Testing Flow

1. **Sign Up**: Start `pnpm dev:all`. Go to `http://localhost:3000/login` and try signing in via Email/Password or Google.
2. **Personal Workspace**: Run `pnpm db:studio` to verify that `user`, `session`, `member`, and `organization` tables were populated. The user should have an active "Personal Workspace".
3. **Cross-subdomain SSO**: Open `http://localhost:3001` (Links app). Check the application cookies. You should see the Better Auth cookies automatically sent, indicating a shared session.
4. **Invitations**: You can invite users via `authClient.organization.inviteMember({ email, role: "member" })`. View server logs to see the generated invitation link (since emails are mocked until configured).
