import { describe, it, expect, vi, beforeEach } from "vitest";
import { listCampaigns, getCampaigns } from "../actions/campaigns";
import { CampaignService } from "@reachdem/core";

// Mock dependencies
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

const authMock = vi.hoisted(() => ({
  api: { getSession: vi.fn() },
}));

vi.mock("@reachdem/auth", () => ({
  auth: authMock,
}));

vi.mock("@reachdem/core", () => ({
  CampaignService: {
    listCampaigns: vi.fn(),
  },
  GroupService: {},
  SegmentService: {},
  RequestCampaignLaunchUseCase: {},
}));

vi.mock("@/lib/publish-campaign-launch-job", () => ({
  publishCampaignLaunchJob: vi.fn(),
}));

describe("Campaign Actions - listCampaigns", () => {
  const mockOrgId = "org-123";
  const mockUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.api.getSession.mockResolvedValue({
      user: { id: mockUserId },
      session: { activeOrganizationId: mockOrgId },
    });
  });

  it("should list campaigns with pagination support", async () => {
    const mockCampaigns = [
      {
        id: "campaign-1",
        organizationId: mockOrgId,
        name: "Test Campaign 1",
        description: "Description 1",
        channel: "sms" as const,
        status: "draft" as const,
        content: { text: "Hello" },
        scheduledAt: null,
        createdBy: mockUserId,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        id: "campaign-2",
        organizationId: mockOrgId,
        name: "Test Campaign 2",
        description: "Description 2",
        channel: "email" as const,
        status: "running" as const,
        content: { subject: "Test", html: "<p>Test</p>" },
        scheduledAt: null,
        createdBy: mockUserId,
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
      },
    ];

    const mockResponse = {
      items: mockCampaigns,
      nextCursor: "cursor-123",
    };

    vi.mocked(CampaignService.listCampaigns).mockResolvedValue(mockResponse);

    const result = await listCampaigns({ limit: 10, cursor: "cursor-abc" });

    expect(CampaignService.listCampaigns).toHaveBeenCalledWith(mockOrgId, {
      limit: 10,
      cursor: "cursor-abc",
    });

    expect(result).toEqual({
      items: mockCampaigns.map((c) => ({
        ...c,
        audienceGroups: [],
        audienceSegments: [],
      })),
      nextCursor: "cursor-123",
    });
  });

  it("should list campaigns without pagination options", async () => {
    const mockCampaigns = [
      {
        id: "campaign-1",
        organizationId: mockOrgId,
        name: "Test Campaign 1",
        description: "Description 1",
        channel: "sms" as const,
        status: "draft" as const,
        content: { text: "Hello" },
        scheduledAt: null,
        createdBy: mockUserId,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ];

    const mockResponse = {
      items: mockCampaigns,
      nextCursor: null,
    };

    vi.mocked(CampaignService.listCampaigns).mockResolvedValue(mockResponse);

    const result = await listCampaigns();

    expect(CampaignService.listCampaigns).toHaveBeenCalledWith(mockOrgId, {});

    expect(result).toEqual({
      items: mockCampaigns.map((c) => ({
        ...c,
        audienceGroups: [],
        audienceSegments: [],
      })),
      nextCursor: null,
    });
  });

  it("should handle errors and throw descriptive message", async () => {
    vi.mocked(CampaignService.listCampaigns).mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(listCampaigns()).rejects.toThrow("Database connection failed");
  });

  it("should handle non-Error exceptions", async () => {
    vi.mocked(CampaignService.listCampaigns).mockRejectedValue("Unknown error");

    await expect(listCampaigns()).rejects.toThrow(
      "Failed to load campaigns. Please try again."
    );
  });

  it("should throw error when user is not authenticated", async () => {
    authMock.api.getSession.mockResolvedValue(null);

    await expect(listCampaigns()).rejects.toThrow("Unauthorized");
  });

  it("should throw error when organization is not selected", async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: mockUserId },
      session: { activeOrganizationId: null },
    });

    await expect(listCampaigns()).rejects.toThrow(
      "Organization selection required"
    );
  });
});

describe("Campaign Actions - getCampaigns (backward compatibility)", () => {
  const mockOrgId = "org-123";
  const mockUserId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.api.getSession.mockResolvedValue({
      user: { id: mockUserId },
      session: { activeOrganizationId: mockOrgId },
    });
  });

  it("should return array of campaigns without pagination info", async () => {
    const mockCampaigns = [
      {
        id: "campaign-1",
        organizationId: mockOrgId,
        name: "Test Campaign 1",
        description: "Description 1",
        channel: "sms" as const,
        status: "draft" as const,
        content: { text: "Hello" },
        scheduledAt: null,
        createdBy: mockUserId,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ];

    const mockResponse = {
      items: mockCampaigns,
      nextCursor: "cursor-123",
    };

    vi.mocked(CampaignService.listCampaigns).mockResolvedValue(mockResponse);

    const result = await getCampaigns();

    expect(CampaignService.listCampaigns).toHaveBeenCalledWith(mockOrgId);

    expect(result).toEqual(
      mockCampaigns.map((c) => ({
        ...c,
        audienceGroups: [],
        audienceSegments: [],
      }))
    );

    // Verify it returns an array, not an object with items/nextCursor
    expect(Array.isArray(result)).toBe(true);
  });
});
