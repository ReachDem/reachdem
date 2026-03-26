import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SmsComposer, type SmsContent } from "../campaigns/sms-composer";

describe("SmsComposer", () => {
  const defaultValue: SmsContent = {
    text: "",
  };

  it("renders message textarea", () => {
    const onChange = vi.fn();
    render(<SmsComposer value={defaultValue} onChange={onChange} />);

    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Type your SMS message here...")
    ).toBeInTheDocument();
  });

  it("displays character count", () => {
    const onChange = vi.fn();
    const value = { text: "Hello World" };
    render(<SmsComposer value={value} onChange={onChange} />);

    expect(screen.getByText(/11\/160 characters/)).toBeInTheDocument();
    expect(screen.getByText(/\(149 remaining\)/)).toBeInTheDocument();
  });

  it("calls onChange when text changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SmsComposer value={defaultValue} onChange={onChange} />);

    const textarea = screen.getByPlaceholderText(
      "Type your SMS message here..."
    );
    await user.type(textarea, "Test message");

    expect(onChange).toHaveBeenCalled();
  });

  it("shows warning when message exceeds 160 characters", () => {
    const onChange = vi.fn();
    const longText = "a".repeat(161);
    const value = { text: longText };
    render(<SmsComposer value={value} onChange={onChange} />);

    expect(
      screen.getByText(/exceeds the 160 character limit/)
    ).toBeInTheDocument();
    expect(screen.getByText(/\(1 over limit\)/)).toBeInTheDocument();
  });

  it("detects URLs in message", () => {
    const onChange = vi.fn();
    const value = { text: "Check out https://example.com for more info" };
    render(<SmsComposer value={value} onChange={onChange} />);

    expect(screen.getByText(/1 URL\(s\) detected/)).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });

  it("detects multiple URLs in message", () => {
    const onChange = vi.fn();
    const value = {
      text: "Visit https://example.com and https://test.com",
    };
    render(<SmsComposer value={value} onChange={onChange} />);

    expect(screen.getByText(/2 URL\(s\) detected/)).toBeInTheDocument();
  });

  it("renders insert variable button", () => {
    const onChange = vi.fn();
    render(<SmsComposer value={defaultValue} onChange={onChange} />);

    expect(
      screen.getByRole("button", { name: /insert variable/i })
    ).toBeInTheDocument();
  });

  it("shows available variables when insert variable is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SmsComposer value={defaultValue} onChange={onChange} />);

    const insertButton = screen.getByRole("button", {
      name: /insert variable/i,
    });
    await user.click(insertButton);

    await waitFor(() => {
      expect(screen.getByText("{{firstName}}")).toBeInTheDocument();
      expect(screen.getByText("{{lastName}}")).toBeInTheDocument();
      expect(screen.getByText("{{email}}")).toBeInTheDocument();
      expect(screen.getByText("{{phone}}")).toBeInTheDocument();
    });
  });

  it("displays SMS preview", () => {
    const onChange = vi.fn();
    const value = { text: "Hello, this is a test message!" };
    render(<SmsComposer value={value} onChange={onChange} />);

    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(
      screen.getByText("Hello, this is a test message!")
    ).toBeInTheDocument();
  });

  it("shows empty message in preview when no text", () => {
    const onChange = vi.fn();
    render(<SmsComposer value={defaultValue} onChange={onChange} />);

    expect(screen.getByText("(Empty message)")).toBeInTheDocument();
  });

  it("disables textarea when disabled prop is true", () => {
    const onChange = vi.fn();
    render(<SmsComposer value={defaultValue} onChange={onChange} disabled />);

    const textarea = screen.getByPlaceholderText(
      "Type your SMS message here..."
    );
    expect(textarea).toBeDisabled();
  });

  it("calculates SMS segments correctly", () => {
    const onChange = vi.fn();
    const value = { text: "a".repeat(320) }; // 2 segments
    render(<SmsComposer value={value} onChange={onChange} />);

    expect(screen.getByText(/~2 SMS segment\(s\)/)).toBeInTheDocument();
  });
});
