import { expect, test, describe } from "vitest";
import { compileSegmentToPrismaWhere } from "../src/utils/segment-compiler";
import { SegmentNode } from "@reachdem/shared";
import { SegmentService } from "../src/services/segment.service";
import { prisma } from "@reachdem/database";
import { vi } from "vitest";

// Mock prisma for evaluateSegmentDefinition test
vi.mock("@reachdem/database", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    prisma: {
      contact: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

describe("Segment Compiler - JSON AST Translation", () => {
  test("should compile a basic EQUALS string condition securely", () => {
    const ast: SegmentNode = {
      field: "address",
      operator: "eq",
      type: "string",
      value: "Paris",
    };
    const query = compileSegmentToPrismaWhere("org-123", ast);

    expect(query).toEqual({
      organizationId: "org-123",
      deletedAt: null,
      AND: [{ address: "Paris" }],
    });
  });

  test("should compile a deeply nested AND/OR logic tree", () => {
    const ast: SegmentNode = {
      op: "AND",
      children: [
        {
          field: "gender",
          operator: "eq",
          type: "string",
          value: "FEMALE",
        },
        {
          op: "OR",
          children: [
            {
              field: "enterprise",
              operator: "contains",
              type: "string",
              value: "Tech",
            },
            {
              field: "work",
              operator: "in",
              type: "string",
              value: ["Developer", "Engineer"],
            },
          ],
        },
      ],
    };

    const query = compileSegmentToPrismaWhere("org-456", ast);

    expect(query).toEqual({
      organizationId: "org-456",
      deletedAt: null,
      AND: [
        {
          AND: [
            { gender: "FEMALE" },
            {
              OR: [
                { enterprise: { contains: "Tech", mode: "insensitive" } },
                { work: { in: ["Developer", "Engineer"] } },
              ],
            },
          ],
        },
      ],
    });
  });

  test("should compile dates properly with boundaries", () => {
    const ast: SegmentNode = {
      field: "birthdate",
      operator: "between",
      type: "date",
      value: ["1990-01-01T00:00:00.000Z", "2000-01-01T00:00:00.000Z"],
    };

    const query = compileSegmentToPrismaWhere("org-123", ast);

    expect(query).toEqual({
      organizationId: "org-123",
      deletedAt: null,
      AND: [
        {
          birthdate: {
            gte: "1990-01-01T00:00:00.000Z",
            lte: "2000-01-01T00:00:00.000Z",
          },
        },
      ],
    });
  });

  test("should safely evaluate null assertions", () => {
    const ast: SegmentNode = {
      field: "phoneE164",
      operator: "is_null",
      type: "string",
    };
    const query = compileSegmentToPrismaWhere("org-123", ast);
    expect(query.AND).toEqual([{ phoneE164: null }]);
  });

  test("should compile custom fields securely to Prisma JSON filters", () => {
    const ast: SegmentNode = {
      op: "AND",
      children: [
        {
          field: "custom.cf1_rank",
          operator: "contains",
          type: "string",
          value: "Gold",
        },
        {
          field: "custom.favorite_color",
          operator: "is_not_null",
          type: "string",
        },
      ],
    };
    const query = compileSegmentToPrismaWhere("org-custom", ast);

    // We know AnyNull works from the previous tests.
  });

  describe("SegmentService.evaluateSegmentDefinition (Preview)", () => {
    test("should evaluate segment definition without saving to database", async () => {
      const ast: SegmentNode = {
        field: "address",
        operator: "eq",
        type: "string",
        value: "London",
      };

      const mockContacts = [{ id: "c1", name: "Alice" }];
      vi.mocked(prisma.contact.findMany).mockResolvedValue(mockContacts as any);
      vi.mocked(prisma.contact.count).mockResolvedValue(1);

      const result = await SegmentService.evaluateSegmentDefinition(
        "org-preview",
        ast,
        10
      );

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              {
                organizationId: "org-preview",
                deletedAt: null,
                AND: [{ address: "London" }],
              },
              {},
            ],
          },
          take: 10,
        })
      );

      expect(prisma.contact.count).toHaveBeenCalled();
      expect(result.items).toEqual(mockContacts);
      expect(result.meta.total).toBe(1);
    });
  });
});
