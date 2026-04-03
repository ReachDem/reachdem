import { founderAdminFeedbackFixtures } from "@/fixtures/founder-admin";
import {
  createFeedback,
  createMockFeedbackRepository,
  createResilientFeedbackRepository,
  getFeedbackSummary,
  listFeedbacks,
} from "@/lib/founder-admin/feedbacks";

describe("founder admin feedbacks", () => {
  it("lists feedback rows from the repository", async () => {
    const repository = createMockFeedbackRepository();
    const rows = await listFeedbacks(repository);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.id).toBe(founderAdminFeedbackFixtures[0]?.id);
  });

  it("creates a feedback row with stable defaults", async () => {
    const repository = createMockFeedbackRepository();
    const created = await createFeedback(
      {
        message: "Need better filtering on feedback status.",
        category: "feature",
        rating: 4,
      },
      repository
    );

    expect(created.id).toContain("feedback-");
    expect(created.source).toBe("dashboard");
    expect(created.status).toBe("new");
    expect(created.message).toContain("better filtering");
  });

  it("aggregates feedback summary by source and status", async () => {
    const repository = createMockFeedbackRepository();
    const summary = await getFeedbackSummary(repository);

    expect(summary.total).toBe(3);
    expect(summary.byStatus.new).toBe(1);
    expect(summary.byStatus.reviewed).toBe(1);
    expect(summary.byStatus.archived).toBe(1);
    expect(summary.bySource.dashboard).toBe(1);
    expect(summary.bySource.widget).toBe(1);
    expect(summary.bySource.manual).toBe(1);
    expect(summary.averageRating).toBeCloseTo(3.67, 2);
  });

  it("falls back to fixtures when the feedback table is missing in development", async () => {
    const fallback = createMockFeedbackRepository();
    const repository = createResilientFeedbackRepository(
      {
        async create() {
          const error = new Error(
            "The table `public.feedbacks` does not exist in the current database."
          ) as Error & { code?: string };
          error.code = "P2021";
          throw error;
        },
        async list() {
          const error = new Error(
            "The table `public.feedbacks` does not exist in the current database."
          ) as Error & { code?: string };
          error.code = "P2021";
          throw error;
        },
      },
      fallback
    );

    const rows = await listFeedbacks(repository);
    const created = await createFeedback(
      {
        message: "Fallback path should stay usable before migration.",
      },
      repository
    );

    expect(rows[0]?.id).toBe(founderAdminFeedbackFixtures[0]?.id);
    expect(created.id).toContain("feedback-");
    expect(created.status).toBe("new");
  });
});
