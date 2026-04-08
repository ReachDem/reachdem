import { Prisma, prisma } from "@reachdem/database";
import { founderAdminFeedbackFixtures } from "@/fixtures/founder-admin";
import type {
  CreateFeedbackInput,
  FeedbackRow,
  FeedbackStatus,
  FeedbackSummary,
  FeedbackSource,
} from "@/lib/founder-admin/types";

export interface FeedbackRepository {
  create(input: CreateFeedbackInput): Promise<FeedbackRow>;
  list(): Promise<FeedbackRow[]>;
}

interface FeedbackRecordWithRelations {
  id: string;
  organizationId: string | null;
  organization: { name: string } | null;
  userId: string | null;
  user: { name: string } | null;
  source: FeedbackSource;
  status: FeedbackStatus;
  category: string | null;
  rating: number | null;
  pagePath: string | null;
  message: string;
  email: string | null;
  metadata: unknown;
  createdAt: Date;
  reviewedAt: Date | null;
}

interface PrismaLikeError {
  code?: string;
  message?: string;
}

function hasDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.PRISMA_ACCELERATE_URL);
}

function isFeedbackTableMissingError(error: unknown): boolean {
  const candidate = error as PrismaLikeError | null;

  if (!candidate) {
    return false;
  }

  if (candidate.code === "P2021") {
    return true;
  }

  return candidate.message?.includes("public.feedbacks") === true;
}

function shouldFallbackToFixtures(error: unknown): boolean {
  return (
    process.env.NODE_ENV !== "production" && isFeedbackTableMissingError(error)
  );
}

function logFeedbackFallback(error: unknown) {
  console.warn(
    "[founder-admin][feedbacks] Falling back to fixtures because the feedbacks table is unavailable.",
    error
  );
}

function toJsonInput(
  metadata?: Record<string, unknown>
): Prisma.InputJsonValue | undefined {
  return metadata ? (metadata as Prisma.InputJsonValue) : undefined;
}

export function createMockFeedbackRepository(
  seed = founderAdminFeedbackFixtures
): FeedbackRepository {
  const rows: FeedbackRow[] = [...seed];

  return {
    async create(input) {
      const created: FeedbackRow = {
        id: `feedback-${String(rows.length + 1).padStart(3, "0")}`,
        organizationId: input.organizationId ?? null,
        organizationName: null,
        userId: input.userId ?? null,
        userName: null,
        source: input.source ?? "dashboard",
        status: input.status ?? "new",
        category: input.category ?? null,
        rating: input.rating ?? null,
        pagePath: input.pagePath ?? null,
        message: input.message,
        email: input.email ?? null,
        createdAt: new Date(),
        reviewedAt: null,
        metadata: input.metadata,
      };
      rows.unshift(created);
      return created;
    },
    async list() {
      return rows.map((row) => ({ ...row }));
    },
  };
}

export function createPrismaFeedbackRepository(): FeedbackRepository {
  return {
    async create(input) {
      const feedback = (await prisma.feedback.create({
        data: {
          organizationId: input.organizationId ?? null,
          userId: input.userId ?? null,
          source: input.source ?? "dashboard",
          status: input.status ?? "new",
          category: input.category ?? null,
          rating: input.rating ?? null,
          pagePath: input.pagePath ?? null,
          message: input.message,
          email: input.email ?? null,
          metadata: toJsonInput(input.metadata),
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
      })) as FeedbackRecordWithRelations;

      return {
        id: feedback.id,
        organizationId: feedback.organizationId,
        organizationName: feedback.organization?.name ?? null,
        userId: feedback.userId,
        userName: feedback.user?.name ?? null,
        source: feedback.source,
        status: feedback.status,
        category: feedback.category,
        rating: feedback.rating,
        pagePath: feedback.pagePath,
        message: feedback.message,
        email: feedback.email,
        createdAt: feedback.createdAt,
        reviewedAt: feedback.reviewedAt,
        metadata:
          feedback.metadata && typeof feedback.metadata === "object"
            ? (feedback.metadata as Record<string, unknown>)
            : undefined,
      };
    },
    async list() {
      const feedbacks = (await prisma.feedback.findMany({
        include: {
          organization: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })) as FeedbackRecordWithRelations[];

      return feedbacks.map((feedback) => ({
        id: feedback.id,
        organizationId: feedback.organizationId,
        organizationName: feedback.organization?.name ?? null,
        userId: feedback.userId,
        userName: feedback.user?.name ?? null,
        source: feedback.source,
        status: feedback.status,
        category: feedback.category,
        rating: feedback.rating,
        pagePath: feedback.pagePath,
        message: feedback.message,
        email: feedback.email,
        createdAt: feedback.createdAt,
        reviewedAt: feedback.reviewedAt,
        metadata:
          feedback.metadata && typeof feedback.metadata === "object"
            ? (feedback.metadata as Record<string, unknown>)
            : undefined,
      }));
    },
  };
}

export function createResilientFeedbackRepository(
  primary: FeedbackRepository,
  fallback: FeedbackRepository = createMockFeedbackRepository()
): FeedbackRepository {
  return {
    async create(input) {
      try {
        return await primary.create(input);
      } catch (error) {
        if (!shouldFallbackToFixtures(error)) {
          throw error;
        }

        logFeedbackFallback(error);
        return fallback.create(input);
      }
    },
    async list() {
      try {
        return await primary.list();
      } catch (error) {
        if (!shouldFallbackToFixtures(error)) {
          throw error;
        }

        logFeedbackFallback(error);
        return fallback.list();
      }
    },
  };
}

function getRepository(repository?: FeedbackRepository): FeedbackRepository {
  if (repository) {
    return repository;
  }

  if (hasDatabaseConfigured()) {
    return createResilientFeedbackRepository(createPrismaFeedbackRepository());
  }

  return createMockFeedbackRepository();
}

function createStatusCounter(): Record<FeedbackStatus, number> {
  return {
    new: 0,
    reviewed: 0,
    archived: 0,
  };
}

function createSourceCounter(): Record<FeedbackSource, number> {
  return {
    dashboard: 0,
    widget: 0,
    email: 0,
    api: 0,
    manual: 0,
  };
}

export async function createFeedback(
  input: CreateFeedbackInput,
  repository?: FeedbackRepository
): Promise<FeedbackRow> {
  return getRepository(repository).create(input);
}

export async function listFeedbacks(
  repository?: FeedbackRepository
): Promise<FeedbackRow[]> {
  return getRepository(repository).list();
}

export async function getFeedbackSummary(
  repository?: FeedbackRepository
): Promise<FeedbackSummary> {
  const rows = await listFeedbacks(repository);
  const ratings = rows
    .map((row) => row.rating)
    .filter((rating): rating is number => typeof rating === "number");

  const byStatus = createStatusCounter();
  const bySource = createSourceCounter();

  for (const row of rows) {
    byStatus[row.status] += 1;
    bySource[row.source] += 1;
  }

  return {
    total: rows.length,
    averageRating:
      ratings.length > 0
        ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
        : null,
    byStatus,
    bySource,
  };
}
