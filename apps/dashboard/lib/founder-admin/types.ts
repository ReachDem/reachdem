export type FounderAdminDataSource =
  | "business-db"
  | "posthog"
  | "mock"
  | "config";
export type FounderAdminAlertLevel = "ok" | "warning" | "critical";
export type FounderAdminLogLevel = "debug" | "info" | "warn" | "error";
export type FounderAdminOpsChannel = "sms" | "email" | "push" | "whatsapp";
export type FounderAdminWorkerStatus =
  | "healthy"
  | "degraded"
  | "offline"
  | "paused";
export type FeedbackSource =
  | "dashboard"
  | "widget"
  | "email"
  | "api"
  | "manual";
export type FeedbackStatus = "new" | "reviewed" | "archived";

export interface FounderAdminDateRange {
  start: Date;
  end: Date;
  label?: string;
}

export interface RevenueSnapshot {
  currency: string;
  range: FounderAdminDateRange;
  collectedRevenueMinor: number;
  estimatedAnnualRevenueMinor: number;
  successfulPaymentsCount: number;
  source: FounderAdminDataSource;
  warnings: string[];
}

export interface CustomerAcquisitionSnapshot {
  weeklyRange: FounderAdminDateRange;
  monthlyRange: FounderAdminDateRange;
  weeklyNewCustomers: number;
  monthlyNewCustomers: number;
  source: FounderAdminDataSource;
  warnings: string[];
}

export interface VisitorPoint {
  date: string;
  value: number;
}

export interface OverviewMetrics {
  generatedAt: Date;
  currency: string;
  revenue: RevenueSnapshot;
  customerAcquisition: CustomerAcquisitionSnapshot;
  activeAccounts30d: number;
  payingUsersCount: number;
  uniqueVisitorsLast10Days: VisitorPoint[];
  sources: {
    revenue: FounderAdminDataSource;
    customerAcquisition: FounderAdminDataSource;
    activeAccounts30d: FounderAdminDataSource;
    payingUsersCount: FounderAdminDataSource;
    uniqueVisitorsLast10Days: FounderAdminDataSource;
  };
  warnings: string[];
}

export interface WorkerStatusRow {
  workerName: string;
  status: FounderAdminWorkerStatus;
  lastHeartbeatAt: Date | null;
  queueDepth: number;
  recentFailuresCount: number;
  averageProcessingTimeMs: number | null;
  source: FounderAdminDataSource;
}

export interface BlockedDeliveryAlert {
  level: FounderAdminAlertLevel;
  impactedCustomersCount: number;
  impactedChannels: FounderAdminOpsChannel[];
  exampleIncidentIds: string[];
  message: string;
  detectedAt: Date;
}

export interface MessageOpsSummary {
  totalPendingByChannel: Record<FounderAdminOpsChannel, number>;
  totalFailedByChannel: Record<FounderAdminOpsChannel, number>;
  delayedSendsByChannel: Record<FounderAdminOpsChannel, number>;
  blockedCreditedCustomersCount: number;
  alertState: FounderAdminAlertLevel;
  detectedAt: Date;
  source: FounderAdminDataSource;
}

export interface OpsIncidentRow {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  channel: FounderAdminOpsChannel | null;
  level: Exclude<FounderAdminAlertLevel, "ok">;
  status: "open" | "acknowledged" | "resolved";
  summary: string;
  detectedAt: Date;
  source: FounderAdminDataSource;
  metadata?: Record<string, unknown>;
}

export interface SystemLogRow {
  id: string;
  timestamp: Date;
  level: FounderAdminLogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface PaginatedLogsParams {
  page?: number;
  pageSize?: number;
  level?: FounderAdminLogLevel;
  category?: string;
  query?: string;
  dateRange?: FounderAdminDateRange;
}

export interface PaginatedLogsResult {
  rows: SystemLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AccountingSnapshot {
  title: string;
  range: FounderAdminDateRange;
  generatedAt: Date;
  currency: string;
  collectedRevenueMinor: number;
  directMessagingCostsMinor: number;
  grossMarginEstimateMinor: number;
  grossMarginEstimateRatio: number;
  successfulPaymentsCount: number;
  payingUsersCount: number;
  newCustomersCount: number;
  sentMessagesByChannel: Record<FounderAdminOpsChannel, number>;
  sources: {
    revenue: FounderAdminDataSource;
    messagingCosts: FounderAdminDataSource;
  };
  warnings: string[];
}

export interface PdfReportInput {
  snapshot: AccountingSnapshot;
  title?: string;
  subtitle?: string;
}

export interface PdfReportResult {
  fileName: string;
  mimeType: "application/pdf";
  bytes: Uint8Array;
  generatedAt: Date;
  pageCount: number;
}

export interface FeedbackRow {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  userId: string | null;
  userName: string | null;
  source: FeedbackSource;
  status: FeedbackStatus;
  category: string | null;
  rating: number | null;
  pagePath: string | null;
  message: string;
  email: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  metadata?: Record<string, unknown>;
}

export interface CreateFeedbackInput {
  organizationId?: string | null;
  userId?: string | null;
  source?: FeedbackSource;
  status?: FeedbackStatus;
  category?: string | null;
  rating?: number | null;
  pagePath?: string | null;
  message: string;
  email?: string | null;
  metadata?: Record<string, unknown>;
}

export interface FeedbackSummary {
  total: number;
  averageRating: number | null;
  byStatus: Record<FeedbackStatus, number>;
  bySource: Record<FeedbackSource, number>;
}
