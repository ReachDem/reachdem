import {
  type PDFPage,
  PDFDocument,
  PageSizes,
  StandardFonts,
  rgb,
} from "pdf-lib";
import {
  founderAdminAccountingFixture,
  founderAdminMonitoringFixtures,
} from "@/fixtures/founder-admin";
import {
  createMockAnalyticsBusinessSource,
  createPrismaAnalyticsBusinessSource,
  getNewCustomersCount,
  getPayingUsersCount,
} from "@/lib/founder-admin/analytics";
import { isWithinRange } from "@/lib/founder-admin/shared/date";
import { safeRatio, sum } from "@/lib/founder-admin/shared/math";
import type {
  AccountingSnapshot,
  FounderAdminDateRange,
  FounderAdminDataSource,
  FounderAdminOpsChannel,
  PdfReportInput,
  PdfReportResult,
} from "@/lib/founder-admin/types";

interface ReportingSuccessfulPaymentRecord {
  amountMinor: number;
  currency: string;
  succeededAt: Date;
}

interface ReportingSentMessageRecord {
  channel: FounderAdminOpsChannel;
  sentAt: Date;
}

export interface ReportingBusinessSource {
  listSuccessfulPaymentsThrough(
    cutoff: Date
  ): Promise<ReportingSuccessfulPaymentRecord[]>;
}

export interface ReportingMessagingSource {
  listSentMessages(
    range: FounderAdminDateRange
  ): Promise<ReportingSentMessageRecord[]>;
}

export interface ReportingServiceOptions {
  asOf?: Date;
  businessSource?: ReportingBusinessSource;
  messagingSource?: ReportingMessagingSource;
}

function hasDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.PRISMA_ACCELERATE_URL);
}

function readPositiveNumber(keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = Number(process.env[key]);
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return fallback;
}

function getChannelCostEstimates(): Record<FounderAdminOpsChannel, number> {
  return {
    sms: readPositiveNumber(
      ["FOUNDER_ADMIN_DIRECT_COST_SMS_MINOR", "DIRECT_COST_SMS_MINOR"],
      90
    ),
    email: readPositiveNumber(
      ["FOUNDER_ADMIN_DIRECT_COST_EMAIL_MINOR", "DIRECT_COST_EMAIL_MINOR"],
      25
    ),
    push: readPositiveNumber(
      ["FOUNDER_ADMIN_DIRECT_COST_PUSH_MINOR", "DIRECT_COST_PUSH_MINOR"],
      5
    ),
    whatsapp: readPositiveNumber(
      [
        "FOUNDER_ADMIN_DIRECT_COST_WHATSAPP_MINOR",
        "DIRECT_COST_WHATSAPP_MINOR",
      ],
      80
    ),
  };
}

export function createMockReportingBusinessSource(): ReportingBusinessSource {
  const source = createMockAnalyticsBusinessSource();

  return {
    async listSuccessfulPaymentsThrough(cutoff) {
      const payments = await source.listSuccessfulPaymentsThrough(cutoff);
      return payments.map((payment) => ({
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        succeededAt: payment.succeededAt,
      }));
    },
  };
}

export function createPrismaReportingBusinessSource(): ReportingBusinessSource {
  const source = createPrismaAnalyticsBusinessSource();

  return {
    async listSuccessfulPaymentsThrough(cutoff) {
      const payments = await source.listSuccessfulPaymentsThrough(cutoff);
      return payments.map((payment) => ({
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        succeededAt: payment.succeededAt,
      }));
    },
  };
}

export function createMockReportingMessagingSource(): ReportingMessagingSource {
  return {
    async listSentMessages(range) {
      return founderAdminMonitoringFixtures.sentMessages.filter((message) =>
        isWithinRange(message.sentAt, range)
      );
    },
  };
}

function resolveBusinessSource(options: ReportingServiceOptions): {
  source: ReportingBusinessSource;
  sourceName: FounderAdminDataSource;
} {
  if (options.businessSource) {
    return {
      source: options.businessSource,
      sourceName: "business-db",
    };
  }

  if (hasDatabaseConfigured()) {
    return {
      source: createPrismaReportingBusinessSource(),
      sourceName: "business-db",
    };
  }

  return {
    source: createMockReportingBusinessSource(),
    sourceName: "mock",
  };
}

function resolveMessagingSource(options: ReportingServiceOptions): {
  source: ReportingMessagingSource;
  sourceName: FounderAdminDataSource;
} {
  if (options.messagingSource) {
    return {
      source: options.messagingSource,
      sourceName: "config",
    };
  }

  return {
    source: createMockReportingMessagingSource(),
    sourceName: "mock",
  };
}

export async function buildAccountingSnapshot(
  range: FounderAdminDateRange,
  options: ReportingServiceOptions = {}
): Promise<AccountingSnapshot> {
  const asOf = options.asOf ?? range.end;
  const { source: businessSource, sourceName: businessSourceName } =
    resolveBusinessSource(options);
  const { source: messagingSource, sourceName: messagingSourceName } =
    resolveMessagingSource(options);
  const payments = await businessSource.listSuccessfulPaymentsThrough(
    range.end
  );
  const successfulPayments = payments.filter((payment) =>
    isWithinRange(payment.succeededAt, range)
  );
  const sentMessages = await messagingSource.listSentMessages(range);
  const directCostConfig = getChannelCostEstimates();
  const collectedRevenueMinor = sum(
    successfulPayments.map((payment) => payment.amountMinor)
  );
  const directMessagingCostsMinor = sum(
    sentMessages.map((message) => directCostConfig[message.channel] ?? 0)
  );
  const grossMarginEstimateMinor =
    collectedRevenueMinor - directMessagingCostsMinor;
  const [payingUsersCount, newCustomersCount] = await Promise.all([
    getPayingUsersCount({ asOf, useMockFallback: true }),
    getNewCustomersCount(range, { asOf, useMockFallback: true }),
  ]);

  return {
    title: "ReachDem Accounting Snapshot",
    range,
    generatedAt: asOf,
    currency: successfulPayments[0]?.currency ?? "XAF",
    collectedRevenueMinor,
    directMessagingCostsMinor,
    grossMarginEstimateMinor,
    grossMarginEstimateRatio: safeRatio(
      grossMarginEstimateMinor,
      collectedRevenueMinor
    ),
    successfulPaymentsCount: successfulPayments.length,
    payingUsersCount,
    newCustomersCount,
    sentMessagesByChannel: {
      sms: sentMessages.filter((message) => message.channel === "sms").length,
      email: sentMessages.filter((message) => message.channel === "email")
        .length,
      push: sentMessages.filter((message) => message.channel === "push").length,
      whatsapp: sentMessages.filter((message) => message.channel === "whatsapp")
        .length,
    },
    sources: {
      revenue: businessSourceName,
      messagingCosts: messagingSourceName,
    },
    warnings: [
      ...(businessSourceName === "mock"
        ? [
            "Using fixture revenue data because no live database provider is configured.",
          ]
        : []),
      ...(messagingSourceName === "mock"
        ? [
            "Using fixture messaging costs because no live delivery cost ledger is configured.",
          ]
        : []),
    ],
  };
}

function formatCurrency(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amountMinor / 100)
    .replace(/[\u202f\u00a0]/g, " ");
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function drawMetricLine(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number
) {
  page.drawText(label, {
    x,
    y,
    size: 11,
    color: rgb(0.28, 0.31, 0.36),
  });
  page.drawText(value, {
    x: x + 280,
    y,
    size: 11,
    color: rgb(0.1, 0.12, 0.15),
  });
}

export async function generateAccountingPdfReport(
  input: PdfReportInput
): Promise<PdfReportResult> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.A4);
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const snapshot = input.snapshot;

  page.drawRectangle({
    x: 0,
    y: 770,
    width: page.getWidth(),
    height: 72,
    color: rgb(0.95, 0.97, 0.99),
  });
  page.drawText(input.title ?? snapshot.title, {
    x: 48,
    y: 800,
    size: 20,
    font: titleFont,
    color: rgb(0.08, 0.12, 0.18),
  });
  page.drawText(input.subtitle ?? "Founder/Admin accounting export", {
    x: 48,
    y: 782,
    size: 10,
    font: bodyFont,
    color: rgb(0.35, 0.38, 0.45),
  });

  page.drawText(
    `Period: ${formatDateLabel(snapshot.range.start)} - ${formatDateLabel(snapshot.range.end)}`,
    {
      x: 48,
      y: 730,
      size: 11,
      font: bodyFont,
      color: rgb(0.18, 0.22, 0.28),
    }
  );
  page.drawText(`Generated: ${formatDateLabel(snapshot.generatedAt)}`, {
    x: 48,
    y: 712,
    size: 11,
    font: bodyFont,
    color: rgb(0.18, 0.22, 0.28),
  });

  const metrics = [
    [
      "Collected revenue",
      formatCurrency(snapshot.collectedRevenueMinor, snapshot.currency),
    ],
    [
      "Direct messaging costs",
      formatCurrency(snapshot.directMessagingCostsMinor, snapshot.currency),
    ],
    [
      "Gross margin estimate",
      formatCurrency(snapshot.grossMarginEstimateMinor, snapshot.currency),
    ],
    ["Gross margin ratio", formatPercent(snapshot.grossMarginEstimateRatio)],
    ["Successful payments", String(snapshot.successfulPaymentsCount)],
    ["Paying users", String(snapshot.payingUsersCount)],
    ["New customers", String(snapshot.newCustomersCount)],
  ] as const;

  metrics.forEach(([label, value], index) => {
    drawMetricLine(page, label, value, 48, 660 - index * 24);
  });

  page.drawText("Messages sent by channel", {
    x: 48,
    y: 460,
    size: 13,
    font: titleFont,
    color: rgb(0.08, 0.12, 0.18),
  });

  Object.entries(snapshot.sentMessagesByChannel).forEach(
    ([channel, value], index) => {
      drawMetricLine(
        page,
        channel.toUpperCase(),
        String(value),
        48,
        430 - index * 22
      );
    }
  );

  if (snapshot.warnings.length > 0) {
    page.drawText("Notes", {
      x: 48,
      y: 320,
      size: 13,
      font: titleFont,
      color: rgb(0.08, 0.12, 0.18),
    });

    snapshot.warnings.slice(0, 3).forEach((warning, index) => {
      page.drawText(`- ${warning}`, {
        x: 48,
        y: 294 - index * 18,
        size: 10,
        font: bodyFont,
        color: rgb(0.35, 0.2, 0.1),
      });
    });
  }

  const bytes = await pdfDoc.save();

  return {
    fileName: `reachdem-accounting-${snapshot.range.end.toISOString().slice(0, 10)}.pdf`,
    mimeType: "application/pdf",
    bytes,
    generatedAt: snapshot.generatedAt,
    pageCount: pdfDoc.getPageCount(),
  };
}

export function createFixtureAccountingSnapshot(): AccountingSnapshot {
  return {
    ...founderAdminAccountingFixture,
  };
}
