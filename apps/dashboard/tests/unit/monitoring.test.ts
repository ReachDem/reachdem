import { founderAdminFixtureNow } from "@/fixtures/founder-admin";
import {
  createMockLogSource,
  createMockMessageSource,
  createMockWorkerSource,
  detectBlockedDeliveryAlert,
  getMessagesOpsSummary,
  getWorkersStatus,
  listSystemLogs,
} from "@/lib/founder-admin/monitoring";

describe("founder admin monitoring", () => {
  it("detects a blocked delivery alert when more than two credited customers are impacted", async () => {
    const alert = await detectBlockedDeliveryAlert({
      asOf: founderAdminFixtureNow,
      messageSource: createMockMessageSource(),
    });

    expect(alert.level).toBe("critical");
    expect(alert.impactedCustomersCount).toBe(3);
    expect(alert.impactedChannels.sort()).toEqual(["email", "sms"]);
    expect(alert.exampleIncidentIds).toContain("msg-ops-001");
  });

  it("builds message ops summary by channel", async () => {
    const summary = await getMessagesOpsSummary({
      asOf: founderAdminFixtureNow,
      messageSource: createMockMessageSource(),
    });

    expect(summary.totalPendingByChannel.sms).toBe(1);
    expect(summary.totalPendingByChannel.email).toBe(2);
    expect(summary.totalFailedByChannel.sms).toBe(1);
    expect(summary.blockedCreditedCustomersCount).toBe(3);
    expect(summary.alertState).toBe("critical");
  });

  it("paginates and filters system logs", async () => {
    const pageOne = await listSystemLogs(
      {
        page: 1,
        pageSize: 20,
        level: "error",
      },
      {
        logSource: createMockLogSource(),
      }
    );

    expect(pageOne.rows).toHaveLength(15);
    expect(pageOne.total).toBe(15);
    expect(pageOne.totalPages).toBe(1);

    const filtered = await listSystemLogs(
      {
        page: 1,
        pageSize: 20,
        query: "stalled",
      },
      {
        logSource: createMockLogSource(),
      }
    );

    expect(filtered.total).toBeGreaterThan(0);
    expect(filtered.rows[0]?.message.toLowerCase()).toContain("stalled");
  });

  it("returns worker statuses in a stable order", async () => {
    const workers = await getWorkersStatus({
      workerSource: createMockWorkerSource(),
    });

    expect(workers.map((worker) => worker.workerName)).toEqual([
      "billing-reconciliation-worker",
      "campaign-launch-worker",
      "email-dispatch-worker",
      "sms-dispatch-worker",
    ]);
  });
});
