import { describe, it, expect, vi, beforeEach } from "vitest";
import { GroupService } from "../src";

// We'll mock the internal prisma database client so we aren't hitting a real DB in unit tests
const prismaMock = vi.hoisted(() => ({
  group: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@reachdem/database", () => ({
  prisma: prismaMock,
  Prisma: {
    JsonNull: "DbNull",
  },
}));

import { prisma } from "@reachdem/database";

describe("Groups API (Core Services)", () => {
  const MOCK_ORG_ID = "mock-org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Group Fetching & Listing", () => {
    it("should list groups retrieved from Prisma mock", async () => {
      const mockGroups = [
        { id: "g1", name: "Group 1" },
        { id: "g2", name: "Group 2" },
      ];
      vi.mocked(prisma.group.findMany as any).mockResolvedValue(mockGroups);
      vi.mocked(prisma.group.count as any).mockResolvedValue(2);

      const result = await GroupService.getGroups(MOCK_ORG_ID, { limit: 10 });

      expect(result.data).toEqual(mockGroups);
      expect(result.meta.total).toBe(2);

      // Verify the mock was called correctly
      expect(prisma.group.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: MOCK_ORG_ID },
          take: 10,
        })
      );
    });
  });

  describe("Group Creation", () => {
    it("should return a rejection if group name already exists", async () => {
      // Mock findFirst to return an existing group (simulating a collision)
      vi.mocked(prisma.group.findFirst as any).mockResolvedValue({
        id: "g1",
        name: "VIPs",
      });

      await expect(
        GroupService.createGroup(MOCK_ORG_ID, { name: "VIPs" })
      ).rejects.toThrow(
        'A group with the name "VIPs" already exists in this workspace.'
      );
    });

    it("should successfully create a new group if valid", async () => {
      // Mock no collision
      vi.mocked(prisma.group.findFirst as any).mockResolvedValue(null);
      // Mock successful creation
      vi.mocked(prisma.group.create as any).mockResolvedValue({
        id: "g_new",
        name: "New Group",
        organizationId: MOCK_ORG_ID,
      });

      const result = await GroupService.createGroup(MOCK_ORG_ID, {
        name: "New Group",
      });

      expect(result.id).toBe("g_new");

      // Verify creation included the organizationID securely
      expect(prisma.group.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "New Group",
          organizationId: MOCK_ORG_ID,
        }),
      });
    });
  });
});
