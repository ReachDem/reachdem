import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AudienceSelector } from "../campaigns/audience-selector";

describe("AudienceSelector", () => {
  const mockGroups = [
    { id: "group-1", name: "Marketing Team" },
    { id: "group-2", name: "Sales Team" },
    { id: "group-3", name: "Support Team" },
  ];

  const mockSegments = [
    { id: "segment-1", name: "Active Users" },
    { id: "segment-2", name: "Premium Customers" },
    { id: "segment-3", name: "Trial Users" },
  ];

  it("renders groups and segments lists", () => {
    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={[]}
        selectedSegments={[]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={vi.fn()}
      />
    );

    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Segments")).toBeInTheDocument();
    expect(screen.getByText("Marketing Team")).toBeInTheDocument();
    expect(screen.getByText("Active Users")).toBeInTheDocument();
  });

  it("displays loading state when isLoading is true", () => {
    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={[]}
        selectedSegments={[]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={vi.fn()}
        isLoading={true}
      />
    );

    // Skeleton loaders should be present
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays empty state when no groups are available", () => {
    render(
      <AudienceSelector
        groups={[]}
        segments={mockSegments}
        selectedGroups={[]}
        selectedSegments={[]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={vi.fn()}
      />
    );

    expect(screen.getByText("No groups available")).toBeInTheDocument();
  });

  it("displays empty state when no segments are available", () => {
    render(
      <AudienceSelector
        groups={mockGroups}
        segments={[]}
        selectedGroups={[]}
        selectedSegments={[]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={vi.fn()}
      />
    );

    expect(screen.getByText("No segments available")).toBeInTheDocument();
  });

  it("calls onGroupsChange when a group is selected", async () => {
    const user = userEvent.setup();
    const onGroupsChange = vi.fn();

    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={[]}
        selectedSegments={[]}
        onGroupsChange={onGroupsChange}
        onSegmentsChange={vi.fn()}
      />
    );

    const checkbox = screen.getByLabelText("Select group Marketing Team");
    await user.click(checkbox);

    expect(onGroupsChange).toHaveBeenCalledWith(["group-1"]);
  });

  it("calls onSegmentsChange when a segment is selected", async () => {
    const user = userEvent.setup();
    const onSegmentsChange = vi.fn();

    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={[]}
        selectedSegments={[]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={onSegmentsChange}
      />
    );

    const checkbox = screen.getByLabelText("Select segment Active Users");
    await user.click(checkbox);

    expect(onSegmentsChange).toHaveBeenCalledWith(["segment-1"]);
  });

  it("displays selected groups and segments with badges", () => {
    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={["group-1", "group-2"]}
        selectedSegments={["segment-1"]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={vi.fn()}
      />
    );

    expect(screen.getByText("Selected Audience")).toBeInTheDocument();
    expect(screen.getByText("Marketing Team")).toBeInTheDocument();
    expect(screen.getByText("Sales Team")).toBeInTheDocument();
    expect(screen.getByText("Active Users")).toBeInTheDocument();
  });

  it("removes a group when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onGroupsChange = vi.fn();

    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={["group-1", "group-2"]}
        selectedSegments={[]}
        onGroupsChange={onGroupsChange}
        onSegmentsChange={vi.fn()}
      />
    );

    const removeButton = screen.getByLabelText("Remove Marketing Team");
    await user.click(removeButton);

    expect(onGroupsChange).toHaveBeenCalledWith(["group-2"]);
  });

  it("removes a segment when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onSegmentsChange = vi.fn();

    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={[]}
        selectedSegments={["segment-1", "segment-2"]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={onSegmentsChange}
      />
    );

    const removeButton = screen.getByLabelText("Remove Active Users");
    await user.click(removeButton);

    expect(onSegmentsChange).toHaveBeenCalledWith(["segment-2"]);
  });

  it("deselects a group when clicking an already selected group", async () => {
    const user = userEvent.setup();
    const onGroupsChange = vi.fn();

    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={["group-1"]}
        selectedSegments={[]}
        onGroupsChange={onGroupsChange}
        onSegmentsChange={vi.fn()}
      />
    );

    const checkbox = screen.getByLabelText("Select group Marketing Team");
    await user.click(checkbox);

    expect(onGroupsChange).toHaveBeenCalledWith([]);
  });

  it("allows selecting multiple groups", async () => {
    const user = userEvent.setup();
    const onGroupsChange = vi.fn();

    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={["group-1"]}
        selectedSegments={[]}
        onGroupsChange={onGroupsChange}
        onSegmentsChange={vi.fn()}
      />
    );

    const checkbox = screen.getByLabelText("Select group Sales Team");
    await user.click(checkbox);

    expect(onGroupsChange).toHaveBeenCalledWith(["group-1", "group-2"]);
  });

  it("allows selecting multiple segments", async () => {
    const user = userEvent.setup();
    const onSegmentsChange = vi.fn();

    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={[]}
        selectedSegments={["segment-1"]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={onSegmentsChange}
      />
    );

    const checkbox = screen.getByLabelText("Select segment Premium Customers");
    await user.click(checkbox);

    expect(onSegmentsChange).toHaveBeenCalledWith(["segment-1", "segment-2"]);
  });

  it("disables all interactions when disabled prop is true", () => {
    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={[]}
        selectedSegments={[]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={vi.fn()}
        disabled={true}
      />
    );

    const groupCheckbox = screen.getByLabelText("Select group Marketing Team");
    const segmentCheckbox = screen.getByLabelText(
      "Select segment Active Users"
    );

    expect(groupCheckbox).toBeDisabled();
    expect(segmentCheckbox).toBeDisabled();
  });

  it("does not show selected audience section when nothing is selected", () => {
    render(
      <AudienceSelector
        groups={mockGroups}
        segments={mockSegments}
        selectedGroups={[]}
        selectedSegments={[]}
        onGroupsChange={vi.fn()}
        onSegmentsChange={vi.fn()}
      />
    );

    expect(screen.queryByText("Selected Audience")).not.toBeInTheDocument();
  });
});
