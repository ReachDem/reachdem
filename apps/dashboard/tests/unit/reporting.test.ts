import {
  founderAdminFixtureNow,
  founderAdminPdfInputFixture,
} from "@/fixtures/founder-admin";
import {
  buildAccountingSnapshot,
  createFixtureAccountingSnapshot,
  createMockReportingBusinessSource,
  createMockReportingMessagingSource,
  generateAccountingPdfReport,
} from "@/lib/founder-admin/reporting";
import { createTrailingRange } from "@/lib/founder-admin/shared/date";

describe("founder admin reporting", () => {
  it("builds an accounting snapshot with gross margin estimate", async () => {
    const snapshot = await buildAccountingSnapshot(
      createTrailingRange(founderAdminFixtureNow, 30, "Last 30 days"),
      {
        asOf: founderAdminFixtureNow,
        businessSource: createMockReportingBusinessSource(),
        messagingSource: createMockReportingMessagingSource(),
      }
    );

    expect(snapshot.collectedRevenueMinor).toBe(310000);
    expect(snapshot.directMessagingCostsMinor).toBe(15400);
    expect(snapshot.grossMarginEstimateMinor).toBe(294600);
    expect(snapshot.successfulPaymentsCount).toBe(5);
  });

  it("generates a readable PDF report", async () => {
    const pdf = await generateAccountingPdfReport({
      ...founderAdminPdfInputFixture,
      snapshot: createFixtureAccountingSnapshot(),
    });

    expect(pdf.mimeType).toBe("application/pdf");
    expect(pdf.pageCount).toBe(1);
    expect(Buffer.from(pdf.bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
