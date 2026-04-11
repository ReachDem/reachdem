import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailComposer, type EmailContent } from "../campaigns/email-composer";

// Mock the maily-to core module
vi.mock("@maily-to/core", () => ({
  Editor: vi.fn(() => <div data-testid="maily-editor">Maily Editor Mock</div>),
}));

describe("EmailComposer", () => {
  const defaultValue: EmailContent = {
    subject: "",
    body: "",
    mode: "visual",
  };

  it("renders subject input field", () => {
    const onChange = vi.fn();
    render(<EmailComposer value={defaultValue} onChange={onChange} />);

    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter email subject...")
    ).toBeInTheDocument();
  });

  it("displays character count for subject", () => {
    const onChange = vi.fn();
    const value = { ...defaultValue, subject: "Test Subject" };
    render(<EmailComposer value={value} onChange={onChange} />);

    expect(screen.getByText("12/200 characters")).toBeInTheDocument();
  });

  it("calls onChange when subject changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EmailComposer value={defaultValue} onChange={onChange} />);

    const subjectInput = screen.getByPlaceholderText("Enter email subject...");
    await user.type(subjectInput, "New Subject");

    expect(onChange).toHaveBeenCalled();
  });

  it("renders mode selector with all three modes", () => {
    const onChange = vi.fn();
    render(<EmailComposer value={defaultValue} onChange={onChange} />);

    expect(screen.getByText("Visual")).toBeInTheDocument();
    expect(screen.getByText("HTML")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("renders preview button", () => {
    const onChange = vi.fn();
    render(<EmailComposer value={defaultValue} onChange={onChange} />);

    expect(
      screen.getByRole("button", { name: /preview/i })
    ).toBeInTheDocument();
  });

  it("toggles preview when preview button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value = { ...defaultValue, subject: "Test", body: "<p>Content</p>" };
    render(<EmailComposer value={value} onChange={onChange} />);

    const previewButton = screen.getByRole("button", { name: /preview/i });
    await user.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText("(No subject)")).toBeInTheDocument();
    });
  });

  it("renders HTML editor when mode is html", () => {
    const onChange = vi.fn();
    const value = { ...defaultValue, mode: "html" as const };
    render(<EmailComposer value={value} onChange={onChange} />);

    expect(screen.getByText("HTML")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter HTML code for your email...")
    ).toBeInTheDocument();
  });

  it("renders React editor when mode is react", () => {
    const onChange = vi.fn();
    const value = { ...defaultValue, mode: "react" as const };
    render(<EmailComposer value={value} onChange={onChange} />);

    expect(screen.getByText("TSX")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter React Email template code...")
    ).toBeInTheDocument();
  });

  it("disables inputs when disabled prop is true", () => {
    const onChange = vi.fn();
    render(<EmailComposer value={defaultValue} onChange={onChange} disabled />);

    const subjectInput = screen.getByPlaceholderText("Enter email subject...");
    expect(subjectInput).toBeDisabled();
  });
});
