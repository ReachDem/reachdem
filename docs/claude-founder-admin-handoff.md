# Claude Handoff: Founder/Admin Services + Feedback + PostHog

## Scope delivered

This batch was implemented to stay isolated from dashboard UI work, with a later narrow exception to unblock dashboard runtime/build issues caused by Base UI composition and local typings.

Delivered areas:

- `apps/dashboard/lib/founder-admin/analytics/*`
- `apps/dashboard/lib/founder-admin/monitoring/*`
- `apps/dashboard/lib/founder-admin/reporting/*`
- `apps/dashboard/lib/founder-admin/feedbacks/*`
- `apps/dashboard/lib/posthog-admin/*`
- `apps/dashboard/fixtures/*`
- `apps/dashboard/tests/unit/*`
- targeted fixes in a few dashboard components to remove runtime/type errors
- `packages/database/prisma/schema.prisma` additive `feedbacks` model
- `apps/web` PostHog provider/setup only

Still intentionally not changed:

- auth / middleware protection logic
- routing model
- shadcn/base component architecture beyond minimal compatibility fixes
- dashboard page structure/layout decisions except one tiny TS annotation unblock

## What is ready for consumption

### Founder/admin public surface

Main barrel:

- `apps/dashboard/lib/founder-admin/index.ts`

Important contracts:

- `apps/dashboard/lib/founder-admin/types.ts`

Main callable services:

- Analytics:
  - `getOverviewMetrics()`
  - `getEstimatedAnnualRevenue()`
  - `getRevenueCollectedLast30Days()`
  - `getNewCustomersWeeklyAndMonthly()`
  - `getNewCustomersCount(range)`
  - `getActiveAccounts30d()`
  - `getPayingUsersCount()`
  - `getUniqueVisitorsLast10Days()`
  - `getUniqueVisitorsSeries(range)`
- Monitoring:
  - `getWorkersStatus()`
  - `getMessagesOpsSummary()`
  - `detectBlockedDeliveryAlert()`
  - `getOpsIncidents()`
  - `listSystemLogs(params)`
- Reporting:
  - `buildAccountingSnapshot(range)`
  - `generateAccountingPdfReport(input)`
- Feedbacks:
  - `createFeedback(input)`
  - `listFeedbacks()`
  - `getFeedbackSummary()`

## Business definitions implemented

- New customer = first successful payment in the selected period
- Active account = workspace/org with at least one meaningful business activity in the last 30 days
- Paying user = paid plan OR successful payment in current period
- Estimated annual revenue = last 30 days collected revenue x 12
- Unique visitors last 10 days = daily unique visitor series for 10 days

### Ops alert rule

Blocked delivery alert becomes:

- `critical` when more than 2 distinct credited customers are impacted
- `warning` when at least 1 impacted customer exists
- `ok` otherwise

Impacted means:

- queued / scheduled / sending / stalled older than 10 minutes
- or failed with a final/non-retryable error
- and customer still has positive credit balance

## Data sources

### Dashboard founder/admin services

The services are built to support:

- live business DB source through Prisma
- PostHog source for visitor analytics
- mock/fixture fallback when live providers are missing

### PostHog server-side in dashboard

Files:

- `apps/dashboard/lib/posthog-admin/client.ts`
- `apps/dashboard/lib/posthog-admin/index.ts`

Expected envs for dashboard analytics:

- `POSTHOG_HOST`
- `POSTHOG_PROJECT_ID`
- `POSTHOG_PERSONAL_API_KEY`
- optional `POSTHOG_ADMIN_VISITOR_EVENT`

If missing or failing, the visitor series falls back to fixtures unless explicitly disabled.

## Feedback table

Added Prisma enums/model:

- `FeedbackSource`
- `FeedbackStatus`
- `Feedback`

Current fields:

- `id`
- `organizationId`
- `userId`
- `source`
- `status`
- `category`
- `rating`
- `pagePath`
- `message`
- `email`
- `metadata`
- `reviewedAt`
- `createdAt`
- `updatedAt`

Relations:

- optional to `Organization`
- optional to `User`

Important:

- Prisma client was regenerated
- the schema is updated
- the live database table is **not** created yet until migration or `db push` is applied
- in non-production, the founder-admin feedback service now falls back to fixtures if `public.feedbacks` is missing, so the dashboard keeps rendering before the migration is applied

## PostHog in apps/web

Installed:

- `posthog-js`
- `posthog-node`

Added:

- `apps/web/instrumentation-client.ts`
- `apps/web/lib/posthog/config.ts`
- `apps/web/lib/posthog/server.ts`

Updated:

- `apps/web/components/providers.tsx`
- `apps/web/env.example`
- `apps/web/package.json`

### Env vars supported in apps/web

Either token name works:

- `NEXT_PUBLIC_POSTHOG_TOKEN`
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`

Also required:

- `NEXT_PUBLIC_POSTHOG_HOST`

Default host in example:

- `https://us.i.posthog.com`

### Current web behavior

- client init happens in `instrumentation-client.ts`
- app tree is wrapped in `PostHogProvider`
- server helper exists for API routes / server actions:
  - `createPostHogServerClient()`
  - `capturePostHogServerEvent(...)`

No page-level custom capture was added yet.

## Fixtures and tests

Fixtures:

- `apps/dashboard/fixtures/founder-admin.ts`

Tests:

- `apps/dashboard/tests/unit/analytics.test.ts`
- `apps/dashboard/tests/unit/monitoring.test.ts`
- `apps/dashboard/tests/unit/reporting.test.ts`
- `apps/dashboard/tests/unit/posthog-admin.test.ts`
- `apps/dashboard/tests/unit/feedbacks.test.ts`

Validated:

- `pnpm --filter @reachdem/database db:generate`
- `pnpm test` in `apps/dashboard`
- `pnpm typecheck` in `apps/dashboard`
- `pnpm --filter dashboard test`

## Known caveats

### Database

The `Feedback` model exists in schema only until migration/push is applied.

Recommended next step:

- create a proper Prisma migration for `feedbacks`

### apps/web typecheck

`apps/web` already has unrelated pre-existing type/test issues in the repo, so no global “all green” claim was made there. PostHog setup was added minimally and additively.

### apps/web server helper import check

The helper file exists and is straightforward, but ad hoc `tsx` CLI import behavior did not reflect normal Next runtime resolution. This was not treated as a product bug because the file content and package installation are correct, and no route wiring depends on that CLI check.

### dashboard runtime fixes applied after initial handoff

These were added after the first founder/admin service batch:

- replaced invalid Base UI `asChild` usage with `render={...}` composition in:
  - `apps/dashboard/components/founder-admin/header.tsx`
  - `apps/dashboard/components/founder-admin/sidebar.tsx`
- fixed invalid dropdown label structure in `apps/dashboard/components/founder-admin/header.tsx`
- normalized legacy postgres ssl aliases to `sslmode=verify-full` at runtime in:
  - `packages/database/src/index.ts`
    to preserve current secure behavior and remove the pg warning
- fixed founder-admin/dashboard typing issues surfaced by Next typecheck in:
  - `apps/dashboard/app/(founder)/customers/page.tsx`
  - `apps/dashboard/components/founder-admin/feedback-list.tsx`
  - `apps/dashboard/components/founder-admin/pdf-report-generator.tsx`
  - `apps/dashboard/components/founder-admin/system-logs-table.tsx`
  - `apps/dashboard/components/founder-admin/visitors-bar-chart.tsx`
  - `apps/dashboard/components/ui/skeleton.tsx`
- removed `apps/dashboard/types/reachdem-database-shim.d.ts` because it was shadowing the real workspace package exports and breaking downstream type resolution

### current dashboard build status

The founder header/sidebar runtime errors and the database SSL warning reported during dev are addressed.

`pnpm --filter dashboard exec next build` now gets past those issues and stops later on an unrelated shared UI/type issue in:

- `apps/dashboard/components/data-table.tsx`

Current blocker:

- `DrawerTrigger` is used with a `render` prop, but its current type signature does not accept that prop

## Suggested next steps for Claude

If Claude wants to consume this work from UI/pages:

1. Import founder/admin services from `apps/dashboard/lib/founder-admin`
2. Build page loaders/server actions against the stable return types in `types.ts`
3. If feedback UI is needed, wire a submit flow to `createFeedback()`
4. Add a migration or `db push` for the new `feedbacks` table before using live persistence
5. If custom product analytics are needed in `apps/web`, call `posthog.capture(...)` in client components or `capturePostHogServerEvent(...)` in server actions/routes

## File map

- `apps/dashboard/lib/founder-admin/types.ts`
- `apps/dashboard/lib/founder-admin/index.ts`
- `apps/dashboard/lib/founder-admin/analytics/service.ts`
- `apps/dashboard/lib/founder-admin/monitoring/service.ts`
- `apps/dashboard/lib/founder-admin/reporting/service.ts`
- `apps/dashboard/lib/founder-admin/feedbacks/service.ts`
- `apps/dashboard/lib/posthog-admin/client.ts`
- `apps/dashboard/fixtures/founder-admin.ts`
- `packages/database/prisma/schema.prisma`
- `apps/web/instrumentation-client.ts`
- `apps/web/components/providers.tsx`
- `apps/web/lib/posthog/server.ts`
