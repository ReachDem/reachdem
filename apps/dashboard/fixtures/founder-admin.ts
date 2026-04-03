import type {
  AccountingSnapshot,
  FounderAdminDataSource,
  FounderAdminDateRange,
  FounderAdminLogLevel,
  FounderAdminOpsChannel,
  OpsIncidentRow,
  OverviewMetrics,
  FeedbackRow,
  SystemLogRow,
  VisitorPoint,
  WorkerStatusRow,
} from "@/lib/founder-admin/types";
import {
  addDays,
  addMinutes,
  createTrailingRange,
  formatDateKey,
} from "@/lib/founder-admin/shared/date";

export interface AnalyticsOrganizationFixture {
  id: string;
  name: string;
  planCode: string;
  creditBalance: number;
  createdAt: Date;
}

export interface PaymentRecordFixture {
  id: string;
  organizationId: string;
  amountMinor: number;
  currency: string;
  kind: "subscription" | "creditPurchase";
  succeededAt: Date;
}

export interface ActivityRecordFixture {
  id: string;
  organizationId: string;
  occurredAt: Date;
  kind: "message" | "campaign" | "payment" | "activity_event";
}

export interface MessageOpsRecordFixture {
  id: string;
  organizationId: string;
  organizationName: string;
  channel: FounderAdminOpsChannel;
  status: "scheduled" | "queued" | "sending" | "sent" | "failed" | "stalled";
  createdAt: Date;
  updatedAt: Date;
  creditBalance: number;
  lastErrorCode?: string | null;
}

export interface SentMessageRecordFixture {
  id: string;
  organizationId: string;
  channel: FounderAdminOpsChannel;
  sentAt: Date;
}

const FIXTURE_NOW = new Date("2026-03-31T12:00:00.000Z");
const TRAILING_10_DAYS = createTrailingRange(FIXTURE_NOW, 10, "Last 10 days");
const TRAILING_30_DAYS = createTrailingRange(FIXTURE_NOW, 30, "Last 30 days");

export const founderAdminFixtureNow = FIXTURE_NOW;

export const founderAdminAnalyticsFixtures = {
  organizations: [
    {
      id: "org-growth-1",
      name: "Acme Reach",
      planCode: "growth",
      creditBalance: 95,
      createdAt: new Date("2025-11-01T10:00:00.000Z"),
    },
    {
      id: "org-pro-1",
      name: "Sunrise Ops",
      planCode: "pro",
      creditBalance: 40,
      createdAt: new Date("2025-12-12T09:00:00.000Z"),
    },
    {
      id: "org-basic-1",
      name: "Northwind Local",
      planCode: "basic",
      creditBalance: 8,
      createdAt: new Date("2026-01-20T08:00:00.000Z"),
    },
    {
      id: "org-free-2",
      name: "Pilot Studio",
      planCode: "free",
      creditBalance: 60,
      createdAt: new Date("2026-02-10T08:00:00.000Z"),
    },
    {
      id: "org-free-3",
      name: "Village Hub",
      planCode: "free",
      creditBalance: 25,
      createdAt: new Date("2026-02-05T08:00:00.000Z"),
    },
  ] satisfies AnalyticsOrganizationFixture[],
  payments: [
    {
      id: "pay-001",
      organizationId: "org-growth-1",
      amountMinor: 75000,
      currency: "XAF",
      kind: "subscription",
      succeededAt: new Date("2026-03-05T10:00:00.000Z"),
    },
    {
      id: "pay-002",
      organizationId: "org-pro-1",
      amountMinor: 120000,
      currency: "XAF",
      kind: "subscription",
      succeededAt: new Date("2026-03-12T14:00:00.000Z"),
    },
    {
      id: "pay-003",
      organizationId: "org-basic-1",
      amountMinor: 50000,
      currency: "XAF",
      kind: "subscription",
      succeededAt: new Date("2026-03-27T11:00:00.000Z"),
    },
    {
      id: "pay-004",
      organizationId: "org-free-2",
      amountMinor: 25000,
      currency: "XAF",
      kind: "creditPurchase",
      succeededAt: new Date("2026-03-30T16:00:00.000Z"),
    },
    {
      id: "pay-005",
      organizationId: "org-growth-1",
      amountMinor: 40000,
      currency: "XAF",
      kind: "creditPurchase",
      succeededAt: new Date("2026-03-28T13:00:00.000Z"),
    },
    {
      id: "pay-006",
      organizationId: "org-free-3",
      amountMinor: 30000,
      currency: "XAF",
      kind: "creditPurchase",
      succeededAt: new Date("2026-02-18T13:00:00.000Z"),
    },
  ] satisfies PaymentRecordFixture[],
  activities: [
    {
      id: "act-001",
      organizationId: "org-growth-1",
      occurredAt: new Date("2026-03-29T09:00:00.000Z"),
      kind: "message",
    },
    {
      id: "act-002",
      organizationId: "org-pro-1",
      occurredAt: new Date("2026-03-28T15:00:00.000Z"),
      kind: "campaign",
    },
    {
      id: "act-003",
      organizationId: "org-basic-1",
      occurredAt: new Date("2026-03-30T13:00:00.000Z"),
      kind: "payment",
    },
    {
      id: "act-004",
      organizationId: "org-free-2",
      occurredAt: new Date("2026-03-27T18:30:00.000Z"),
      kind: "activity_event",
    },
    {
      id: "act-005",
      organizationId: "org-free-3",
      occurredAt: new Date("2026-03-12T10:15:00.000Z"),
      kind: "message",
    },
  ] satisfies ActivityRecordFixture[],
  visitors: [45, 49, 52, 48, 60, 58, 63, 67, 71, 74].map((value, index) => ({
    date: formatDateKey(addDays(TRAILING_10_DAYS.start, index)),
    value,
  })) satisfies VisitorPoint[],
};

export const founderAdminMonitoringFixtures = {
  workers: [
    {
      workerName: "campaign-launch-worker",
      status: "healthy",
      lastHeartbeatAt: addMinutes(FIXTURE_NOW, -1),
      queueDepth: 4,
      recentFailuresCount: 0,
      averageProcessingTimeMs: 420,
      source: "mock",
    },
    {
      workerName: "sms-dispatch-worker",
      status: "degraded",
      lastHeartbeatAt: addMinutes(FIXTURE_NOW, -3),
      queueDepth: 19,
      recentFailuresCount: 3,
      averageProcessingTimeMs: 1800,
      source: "mock",
    },
    {
      workerName: "email-dispatch-worker",
      status: "healthy",
      lastHeartbeatAt: addMinutes(FIXTURE_NOW, -2),
      queueDepth: 7,
      recentFailuresCount: 1,
      averageProcessingTimeMs: 960,
      source: "mock",
    },
    {
      workerName: "billing-reconciliation-worker",
      status: "paused",
      lastHeartbeatAt: addMinutes(FIXTURE_NOW, -12),
      queueDepth: 0,
      recentFailuresCount: 0,
      averageProcessingTimeMs: null,
      source: "mock",
    },
  ] satisfies WorkerStatusRow[],
  messages: [
    {
      id: "msg-ops-001",
      organizationId: "org-growth-1",
      organizationName: "Acme Reach",
      channel: "sms",
      status: "queued",
      createdAt: addMinutes(FIXTURE_NOW, -48),
      updatedAt: addMinutes(FIXTURE_NOW, -41),
      creditBalance: 95,
      lastErrorCode: null,
    },
    {
      id: "msg-ops-002",
      organizationId: "org-pro-1",
      organizationName: "Sunrise Ops",
      channel: "email",
      status: "stalled",
      createdAt: addMinutes(FIXTURE_NOW, -26),
      updatedAt: addMinutes(FIXTURE_NOW, -22),
      creditBalance: 40,
      lastErrorCode: null,
    },
    {
      id: "msg-ops-003",
      organizationId: "org-free-2",
      organizationName: "Pilot Studio",
      channel: "sms",
      status: "failed",
      createdAt: addMinutes(FIXTURE_NOW, -18),
      updatedAt: addMinutes(FIXTURE_NOW, -15),
      creditBalance: 60,
      lastErrorCode: "21610",
    },
    {
      id: "msg-ops-004",
      organizationId: "org-basic-1",
      organizationName: "Northwind Local",
      channel: "email",
      status: "queued",
      createdAt: addMinutes(FIXTURE_NOW, -5),
      updatedAt: addMinutes(FIXTURE_NOW, -4),
      creditBalance: 8,
      lastErrorCode: null,
    },
    {
      id: "msg-ops-005",
      organizationId: "org-growth-1",
      organizationName: "Acme Reach",
      channel: "sms",
      status: "sent",
      createdAt: addMinutes(FIXTURE_NOW, -8),
      updatedAt: addMinutes(FIXTURE_NOW, -7),
      creditBalance: 95,
      lastErrorCode: null,
    },
  ] satisfies MessageOpsRecordFixture[],
  sentMessages: [
    ...Array.from({ length: 160 }, (_, index) => ({
      id: `sent-sms-${index + 1}`,
      organizationId: index % 2 === 0 ? "org-growth-1" : "org-pro-1",
      channel: "sms" as const,
      sentAt: addDays(FIXTURE_NOW, -((index % 20) + 1)),
    })),
    ...Array.from({ length: 40 }, (_, index) => ({
      id: `sent-email-${index + 1}`,
      organizationId: index % 2 === 0 ? "org-basic-1" : "org-free-2",
      channel: "email" as const,
      sentAt: addDays(FIXTURE_NOW, -((index % 15) + 1)),
    })),
  ] satisfies SentMessageRecordFixture[],
};

export const founderAdminIncidentFixtures = [
  {
    id: "incident-001",
    organizationId: "org-growth-1",
    organizationName: "Acme Reach",
    channel: "sms",
    level: "critical",
    status: "open",
    summary:
      "Queued SMS has been pending for more than 10 minutes with credits available.",
    detectedAt: addMinutes(FIXTURE_NOW, -41),
    source: "mock",
    metadata: { messageId: "msg-ops-001" },
  },
  {
    id: "incident-002",
    organizationId: "org-pro-1",
    organizationName: "Sunrise Ops",
    channel: "email",
    level: "warning",
    status: "open",
    summary: "Email worker is stalled while customer credits remain available.",
    detectedAt: addMinutes(FIXTURE_NOW, -22),
    source: "mock",
    metadata: { messageId: "msg-ops-002" },
  },
] satisfies OpsIncidentRow[];

const LOG_LEVELS: FounderAdminLogLevel[] = ["info", "warn", "error"];
const LOG_CATEGORIES = ["messaging", "billing", "worker", "delivery"];

export const founderAdminSystemLogFixtures = Array.from(
  { length: 45 },
  (_, index) =>
    ({
      id: `log-${String(index + 1).padStart(3, "0")}`,
      timestamp: addMinutes(FIXTURE_NOW, -(index * 11 + 2)),
      level: LOG_LEVELS[index % LOG_LEVELS.length],
      category: LOG_CATEGORIES[index % LOG_CATEGORIES.length],
      message:
        index % 5 === 0
          ? `Delivery queue stalled for workspace segment ${index + 1}`
          : `Worker checkpoint ${index + 1} processed successfully`,
      context: {
        correlationId: `corr-${index + 1}`,
        workerName:
          founderAdminMonitoringFixtures.workers[
            index % founderAdminMonitoringFixtures.workers.length
          ]?.workerName,
      },
    }) satisfies SystemLogRow
);

export const founderAdminAccountingFixture: AccountingSnapshot = {
  title: "ReachDem Accounting Snapshot",
  range: TRAILING_30_DAYS,
  generatedAt: FIXTURE_NOW,
  currency: "XAF",
  collectedRevenueMinor: 310000,
  directMessagingCostsMinor: 15400,
  grossMarginEstimateMinor: 294600,
  grossMarginEstimateRatio: 0.9503225806451613,
  successfulPaymentsCount: 5,
  payingUsersCount: 4,
  newCustomersCount: 4,
  sentMessagesByChannel: {
    sms: 160,
    email: 40,
    push: 0,
    whatsapp: 0,
  },
  sources: {
    revenue: "business-db",
    messagingCosts: "config",
  },
  warnings: [],
};

export const founderAdminPdfInputFixture = {
  snapshot: founderAdminAccountingFixture,
  title: "ReachDem Accounting Report",
  subtitle: "Internal founder/admin export",
};

export const founderAdminOverviewFixture: OverviewMetrics = {
  generatedAt: FIXTURE_NOW,
  currency: "XAF",
  revenue: {
    currency: "XAF",
    range: TRAILING_30_DAYS,
    collectedRevenueMinor: 310000,
    estimatedAnnualRevenueMinor: 3720000,
    successfulPaymentsCount: 5,
    source: "business-db",
    warnings: [],
  },
  customerAcquisition: {
    weeklyRange: createTrailingRange(FIXTURE_NOW, 7, "Last 7 days"),
    monthlyRange: TRAILING_30_DAYS,
    weeklyNewCustomers: 2,
    monthlyNewCustomers: 4,
    source: "business-db",
    warnings: [],
  },
  activeAccounts30d: 5,
  payingUsersCount: 4,
  uniqueVisitorsLast10Days: founderAdminAnalyticsFixtures.visitors,
  sources: {
    revenue: "business-db",
    customerAcquisition: "business-db",
    activeAccounts30d: "business-db",
    payingUsersCount: "business-db",
    uniqueVisitorsLast10Days: "posthog",
  },
  warnings: [],
};

export const founderAdminFeedbackFixtures = [
  {
    id: "feedback-001",
    organizationId: "org-growth-1",
    organizationName: "Acme Reach",
    userId: "user-001",
    userName: "Ada Founder",
    source: "dashboard",
    status: "new",
    category: "ux",
    rating: 4,
    pagePath: "/founder/overview",
    message: "The overview needs one-click export for the revenue chart.",
    email: "ada@acme.test",
    createdAt: new Date("2026-03-30T09:30:00.000Z"),
    reviewedAt: null,
    metadata: {
      browser: "Chrome",
    },
  },
  {
    id: "feedback-002",
    organizationId: "org-pro-1",
    organizationName: "Sunrise Ops",
    userId: "user-002",
    userName: "Mo Admin",
    source: "widget",
    status: "reviewed",
    category: "bug",
    rating: 2,
    pagePath: "/founder/ops",
    message: "Queued messages should expose a clearer delay reason.",
    email: "mo@sunrise.test",
    createdAt: new Date("2026-03-28T15:00:00.000Z"),
    reviewedAt: new Date("2026-03-29T11:00:00.000Z"),
    metadata: {
      severity: "medium",
    },
  },
  {
    id: "feedback-003",
    organizationId: null,
    organizationName: null,
    userId: null,
    userName: null,
    source: "manual",
    status: "archived",
    category: "feature",
    rating: 5,
    pagePath: null,
    message: "Accounting PDF is clean and easy to share with advisors.",
    email: null,
    createdAt: new Date("2026-03-25T10:00:00.000Z"),
    reviewedAt: new Date("2026-03-26T10:00:00.000Z"),
    metadata: {
      channel: "founder-call",
    },
  },
] satisfies FeedbackRow[];

export function createMockSourceTag(
  source: FounderAdminDataSource = "mock"
): FounderAdminDataSource {
  return source;
}

export function createFixtureDateRange(): FounderAdminDateRange {
  return {
    start: TRAILING_30_DAYS.start,
    end: TRAILING_30_DAYS.end,
    label: TRAILING_30_DAYS.label,
  };
}
