# ReachDem / Links – Project Context for Copilot

You are assisting on a SaaS project called **ReachDem**, with two main components:

1. **ReachDem multichannel platform** – manage workspaces (projects), contacts, SMS/email/WhatsApp campaigns, templates, short links, and metrics.
2. **Links by ReachDem** – link-in-bio product with RFID business cards, powered by the same auth & database.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Runtime**: TypeScript
- **Backend style**: Next.js Route Handlers in `app/api/*` (no separate Express/Nest backend for now)
- **Database**: Neon (PostgreSQL)
- **ORM**: Prisma
- **Auth**: Better Auth (single unified auth for all apps)
- **Validation**: Zod (for request body / query validation)
- **Scheduling**:
  - Primary: HTTP cron-style endpoint (e.g. `/api/cron/send-scheduled-emails`)
  - Triggered by: Vercel Cron, Cloudflare Worker, or external cron service (like cron-job.org) calling the endpoint regularly.

We want **simple, iterative, and type-safe** code, not over-engineered. No tRPC yet; we might add it later.
work first in the web app directory, we will use packages when the projects will grow enough to need it

---

PS : you can use actual context to improve what you need to improve or just adjust, you can also use the Context7 tools if you want a docs about one specific tech. you can also use the neon tool to check the database when applying migration

## Auth & User Model

- We use **Better Auth** as the auth system.
- There is a **single auth backend** that manages:
  - users
  - sessions
  - accounts
- Auth cookies should be configured with a domain like `.reachdem.cc` so that future subdomains share sessions.
- Prisma must contain a `User` model (Better Auth generated or compatible) with at least:
  - `id: String @id`
  - `email: String @unique`
- The `User` model also has relations to:
  - workspaces owned
  - memberships
  - campaigns created
  - templates created
  - link-in-bio profiles
  - short links created

Example relations we rely on:

```prisma
model User {
  id              String              @id @default(cuid())
  email           String              @unique
  // other Better Auth fields...

  workspacesOwned Workspace[]         @relation("OwnerWorkspaces")
  memberships     WorkspaceMember[]
  campaigns       Campaign[]          @relation("CampaignCreatedBy")
  emailTemplates  EmailTemplate[]
  smsTemplates    SmsTemplate[]
  linkProfiles    LinkProfile[]
  shortLinks      ShortLink[]         @relation("ShortLinkCreatedBy")

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}
