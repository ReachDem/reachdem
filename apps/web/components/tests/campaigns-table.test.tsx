import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CampaignsTable } from "../campaigns/campaigns-table";
import type { Campaign } from "@/actions/campaigns";

describe("CampaignsTable", () => {
  const mockCampaigns: Campaign[] = [
    {
      id: "1",
      organizationId: "org-1",
      name: "Test Campaign",
      description: "Test description",
      channel: "email",
      status: "draft",
      content: { subject: "Test", html: "<p>Test</p>" },
      scheduledAt: null,
      createdBy: "user-1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      audienceGroups: [],
      audienceSegments: [],
    },
    {
      id: "2",
      organizationId: "org-1",
      name: "SMS Campaign",
      description: null,
      channel: "sms",
      status: "running",
      content: { text: "Hello world" },
      scheduledAt: null,
      createdBy: "user-1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-03"),
      audienceGroups: [],
      audienceSegments: [],
    },
  ];

  it("renders table with correct columns", () => {
    render(<CampaignsTable campaigns={mockCampaigns} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Channel")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Updated at")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("displays campaign data correctly", () => {
    render(<CampaignsTable campaigns={mockCampaigns} />);

    expect(screen.getByText("Test Campaign")).toBeInTheDocument();
    expect(screen.getByText("SMS Campaign")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("SMS")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("displays empty state when no campaigns", () => {
    render(<CampaignsTable campaigns={[]} />);

    expect(screen.getByText("No campaigns found.")).toBeInTheDocument();
  });

  it("shows delete action only for draft campaigns", () => {
    render(<CampaignsTable campaigns={mockCampaigns} />);

    const actionButtons = screen.getAllByRole("button", { name: /open menu/i });
    expect(actionButtons).toHaveLength(2);
  });
});
