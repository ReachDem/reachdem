import { classifyError } from "@reachdem/core";
import { prisma } from "@reachdem/database";
import {
  founderAdminIncidentFixtures,
  founderAdminMonitoringFixtures,
  founderAdminSystemLogFixtures,
} from "@/fixtures/founder-admin";
import {
  addMinutes,
  countByChannel,
  createTrailingRange,
  unique,
} from "@/lib/founder-admin/shared/date";
import type {
  BlockedDeliveryAlert,
  FounderAdminAlertLevel,
  FounderAdminDataSource,
  FounderAdminDateRange,
  FounderAdminOpsChannel,
  MessageOpsSummary,
  OpsIncidentRow,
  PaginatedLogsParams,
  PaginatedLogsResult,
  SystemLogRow,
  WorkerStatusRow,
} from "@/lib/founder-admin/types";

type MessageStatusRecord =
  | "scheduled"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "stalled";

interface MessageOpsRecord {
  id: string;
  organizationId: string;
  organizationName: string;
  channel: FounderAdminOpsChannel;
  status: MessageStatusRecord;
  createdAt: Date;
  updatedAt: Date;
  creditBalance: number;
  lastErrorCode?: string | null;
}

export interface OpsMessageSource {
  listMessages(): Promise<MessageOpsRecord[]>;
}

export interface OpsWorkerSource {
  listWorkers(): Promise<WorkerStatusRow[]>;
}

export interface OpsIncidentSource {
  listIncidents(range: FounderAdminDateRange): Promise<OpsIncidentRow[]>;
}

export interface OpsLogSource {
  listLogs(range?: FounderAdminDateRange): Promise<SystemLogRow[]>;
}

export interface MonitoringServiceOptions {
  asOf?: Date;
  delayedMinutesThreshold?: number;
  messageSource?: OpsMessageSource;
  workerSource?: OpsWorkerSource;
  incidentSource?: OpsIncidentSource;
  logSource?: OpsLogSource;
}

function hasDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.PRISMA_ACCELERATE_URL);
}

export function createMockMessageSource(
  messages = founderAdminMonitoringFixtures.messages
): OpsMessageSource {
  return {
    async listMessages() {
      return messages.map((message) => ({ ...message }));
    },
  };
}

export function createMockWorkerSource(
  workers = founderAdminMonitoringFixtures.workers
): OpsWorkerSource {
  return {
    async listWorkers() {
      return workers.map((worker) => ({ ...worker }));
    },
  };
}

export function createMockIncidentSource(
  incidents = founderAdminIncidentFixtures
): OpsIncidentSource {
  return {
    async listIncidents() {
      return incidents.map((incident) => ({ ...incident }));
    },
  };
}

export function createMockLogSource(
  logs = founderAdminSystemLogFixtures
): OpsLogSource {
  return {
    async listLogs() {
      return logs.map((log) => ({ ...log }));
    },
  };
}

export function createPrismaMessageSource(): OpsMessageSource {
  return {
    async listMessages() {
      const staleThreshold = addMinutes(new Date(), -10);
      const messages = await prisma.message.findMany({
        where: {
          status: {
            in: ["scheduled", "queued", "sending", "sent", "failed"],
          },
        },
        select: {
          id: true,
          channel: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              creditBalance: true,
            },
          },
          attempts: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              errorCode: true,
            },
          },
        },
      });

      return messages.map(
        (message: {
          id: string;
          channel: FounderAdminOpsChannel;
          status: "scheduled" | "queued" | "sending" | "sent" | "failed";
          createdAt: Date;
          updatedAt: Date;
          organization: { id: string; name: string; creditBalance: number };
          attempts: Array<{ errorCode: string | null }>;
        }) => ({
          id: message.id,
          organizationId: message.organization.id,
          organizationName: message.organization.name,
          channel: message.channel,
          status:
            message.status === "sending" && message.updatedAt <= staleThreshold
              ? "stalled"
              : message.status,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          creditBalance: message.organization.creditBalance,
          lastErrorCode: message.attempts[0]?.errorCode ?? null,
        })
      );
    },
  };
}

export function createPrismaIncidentSource(): OpsIncidentSource {
  return {
    async listIncidents(range) {
      const events = await prisma.activityEvent.findMany({
        where: {
          createdAt: {
            gte: range.start,
            lte: range.end,
          },
          OR: [
            { severity: "warn" },
            { severity: "error" },
            { status: "failed" },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        select: {
          id: true,
          organizationId: true,
          organization: {
            select: {
              name: true,
            },
          },
          category: true,
          status: true,
          severity: true,
          createdAt: true,
          meta: true,
        },
      });

      return events.map((event) => ({
        id: event.id,
        organizationId: event.organizationId,
        organizationName: event.organization.name,
        channel: null,
        level: event.severity === "error" ? "critical" : "warning",
        status: event.status === "success" ? "resolved" : "open",
        summary: `${event.category} event entered ${event.status} state`,
        detectedAt: event.createdAt,
        source: "business-db",
        metadata:
          event.meta && typeof event.meta === "object"
            ? (event.meta as Record<string, unknown>)
            : undefined,
      }));
    },
  };
}

export function createPrismaLogSource(): OpsLogSource {
  return {
    async listLogs(range) {
      const events = await prisma.activityEvent.findMany({
        where: range
          ? {
              createdAt: {
                gte: range.start,
                lte: range.end,
              },
            }
          : undefined,
        orderBy: {
          createdAt: "desc",
        },
        take: 200,
        select: {
          id: true,
          createdAt: true,
          category: true,
          status: true,
          severity: true,
          correlationId: true,
          meta: true,
        },
      });

      return events.map((event) => ({
        id: event.id,
        timestamp: event.createdAt,
        level:
          event.severity === "error"
            ? "error"
            : event.severity === "warn"
              ? "warn"
              : "info",
        category: event.category,
        message: `Activity ${event.status} for ${event.category}`,
        context:
          event.meta && typeof event.meta === "object"
            ? {
                correlationId: event.correlationId,
                ...(event.meta as Record<string, unknown>),
              }
            : { correlationId: event.correlationId },
      }));
    },
  };
}

function resolveMessageSource(options: MonitoringServiceOptions): {
  source: OpsMessageSource;
  sourceName: FounderAdminDataSource;
} {
  if (options.messageSource) {
    return { source: options.messageSource, sourceName: "business-db" };
  }

  if (hasDatabaseConfigured()) {
    return { source: createPrismaMessageSource(), sourceName: "business-db" };
  }

  return { source: createMockMessageSource(), sourceName: "mock" };
}

function resolveWorkerSource(
  options: MonitoringServiceOptions
): OpsWorkerSource {
  return options.workerSource ?? createMockWorkerSource();
}

function resolveIncidentSource(
  options: MonitoringServiceOptions
): OpsIncidentSource {
  if (options.incidentSource) {
    return options.incidentSource;
  }

  if (hasDatabaseConfigured()) {
    return createPrismaIncidentSource();
  }

  return createMockIncidentSource();
}

function resolveLogSource(options: MonitoringServiceOptions): OpsLogSource {
  if (options.logSource) {
    return options.logSource;
  }

  if (hasDatabaseConfigured()) {
    return createPrismaLogSource();
  }

  return createMockLogSource();
}

function isDelayedMessage(
  message: MessageOpsRecord,
  now: Date,
  delayedMinutesThreshold: number
): boolean {
  const thresholdTime = addMinutes(now, -delayedMinutesThreshold);

  if (
    (message.status === "queued" ||
      message.status === "scheduled" ||
      message.status === "sending" ||
      message.status === "stalled") &&
    message.updatedAt <= thresholdTime
  ) {
    return true;
  }

  if (message.status === "failed") {
    const classification = message.lastErrorCode
      ? classifyError(message.lastErrorCode)
      : "retryable";

    return classification === "final" || message.updatedAt <= thresholdTime;
  }

  return false;
}

function buildAlertMessage(
  impactedCustomersCount: number,
  impactedChannels: FounderAdminOpsChannel[]
): string {
  if (impactedCustomersCount === 0) {
    return "No blocked deliveries detected for credited customers.";
  }

  return `${impactedCustomersCount} credited customers have delayed or failed sends across ${impactedChannels.join(", ")}.`;
}

export async function detectBlockedDeliveryAlert(
  options: MonitoringServiceOptions = {}
): Promise<BlockedDeliveryAlert> {
  const now = options.asOf ?? new Date();
  const delayedMinutesThreshold = options.delayedMinutesThreshold ?? 10;
  const { source } = resolveMessageSource(options);
  const messages = await source.listMessages();
  const abnormal = messages.filter(
    (message) =>
      message.creditBalance > 0 &&
      isDelayedMessage(message, now, delayedMinutesThreshold)
  );
  const impactedCustomers = unique(
    abnormal.map((message) => message.organizationId)
  );
  const impactedChannels = unique(abnormal.map((message) => message.channel));
  const level: FounderAdminAlertLevel =
    impactedCustomers.length > 2
      ? "critical"
      : impactedCustomers.length > 0
        ? "warning"
        : "ok";

  return {
    level,
    impactedCustomersCount: impactedCustomers.length,
    impactedChannels,
    exampleIncidentIds: abnormal.slice(0, 5).map((message) => message.id),
    message: buildAlertMessage(impactedCustomers.length, impactedChannels),
    detectedAt: now,
  };
}

export async function getMessagesOpsSummary(
  options: MonitoringServiceOptions = {}
): Promise<MessageOpsSummary> {
  const now = options.asOf ?? new Date();
  const delayedMinutesThreshold = options.delayedMinutesThreshold ?? 10;
  const { source, sourceName } = resolveMessageSource(options);
  const messages = await source.listMessages();
  const pendingMessages = messages.filter((message) =>
    ["scheduled", "queued", "sending", "stalled"].includes(message.status)
  );
  const failedMessages = messages.filter(
    (message) => message.status === "failed"
  );
  const delayedMessages = messages.filter((message) =>
    isDelayedMessage(message, now, delayedMinutesThreshold)
  );
  const alert = await detectBlockedDeliveryAlert(options);

  return {
    totalPendingByChannel: countByChannel(pendingMessages),
    totalFailedByChannel: countByChannel(failedMessages),
    delayedSendsByChannel: countByChannel(delayedMessages),
    blockedCreditedCustomersCount: alert.impactedCustomersCount,
    alertState: alert.level,
    detectedAt: alert.detectedAt,
    source: sourceName,
  };
}

export async function getWorkersStatus(
  options: MonitoringServiceOptions = {}
): Promise<WorkerStatusRow[]> {
  const source = resolveWorkerSource(options);
  const workers = await source.listWorkers();

  return workers.sort((left, right) =>
    left.workerName.localeCompare(right.workerName)
  );
}

export async function getOpsIncidents(
  options: MonitoringServiceOptions = {}
): Promise<OpsIncidentRow[]> {
  const range = createTrailingRange(
    options.asOf ?? new Date(),
    7,
    "Last 7 days"
  );
  const source = resolveIncidentSource(options);
  const incidents = await source.listIncidents(range);
  const alert = await detectBlockedDeliveryAlert(options);

  const derivedAlertIncidents: OpsIncidentRow[] =
    alert.level === "ok"
      ? []
      : alert.exampleIncidentIds.map((incidentId) => ({
          id: `blocked-${incidentId}`,
          organizationId: null,
          organizationName: null,
          channel: null,
          level: alert.level === "critical" ? "critical" : "warning",
          status: "open",
          summary: alert.message,
          detectedAt: alert.detectedAt,
          source: "business-db",
          metadata: {
            exampleIncidentId: incidentId,
          },
        }));

  return [...derivedAlertIncidents, ...incidents]
    .sort(
      (left, right) => right.detectedAt.getTime() - left.detectedAt.getTime()
    )
    .slice(0, 50);
}

export async function listSystemLogs(
  params: PaginatedLogsParams = {},
  options: MonitoringServiceOptions = {}
): Promise<PaginatedLogsResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 20, 100));
  const source = resolveLogSource(options);
  const rows = await source.listLogs(params.dateRange);
  const query = params.query?.trim().toLowerCase();

  const filtered = rows.filter((row) => {
    const matchesLevel = params.level ? row.level === params.level : true;
    const matchesCategory = params.category
      ? row.category === params.category
      : true;
    const matchesQuery = query
      ? `${row.message} ${row.category} ${JSON.stringify(row.context ?? {})}`
          .toLowerCase()
          .includes(query)
      : true;

    return matchesLevel && matchesCategory && matchesQuery;
  });

  const sorted = filtered.sort(
    (left, right) => right.timestamp.getTime() - left.timestamp.getTime()
  );
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;

  return {
    rows: sorted.slice(startIndex, startIndex + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}
