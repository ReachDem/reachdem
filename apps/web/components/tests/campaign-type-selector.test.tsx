import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampaignTypeSelector } from "../campaigns/campaign-type-selector";

describe("CampaignTypeSelector", () => {
  it("renders both Email and SMS options", () => {
    const onChange = vi.fn();
    render(<CampaignTypeSelector value={null} onChange={onChange} />);

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("SMS")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reach out with rich content, images, and personalized messages"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Direct messaging for quick, urgent communications")
    ).toBeInTheDocument();
  });

  it("calls onChange when Email is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CampaignTypeSelector value={null} onChange={onChange} />);

    const emailButton = screen.getByRole("button", { name: /email/i });
    await user.click(emailButton);

    expect(onChange).toHaveBeenCalledWith("email");
  });

  it("calls onChange when SMS is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CampaignTypeSelector value={null} onChange={onChange} />);

    const smsButton = screen.getByRole("button", { name: /sms/i });
    await user.click(smsButton);

    expect(onChange).toHaveBeenCalledWith("sms");
  });

  it("highlights selected option", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CampaignTypeSelector value="email" onChange={onChange} />
    );

    const emailButton = screen.getByRole("button", { name: /email/i });
    expect(emailButton).toHaveClass("border-primary");

    rerender(<CampaignTypeSelector value="sms" onChange={onChange} />);

    const smsButton = screen.getByRole("button", { name: /sms/i });
    expect(smsButton).toHaveClass("border-primary");
  });

  it("disables buttons when disabled prop is true", () => {
    const onChange = vi.fn();
    render(<CampaignTypeSelector value={null} onChange={onChange} disabled />);

    const emailButton = screen.getByRole("button", { name: /email/i });
    const smsButton = screen.getByRole("button", { name: /sms/i });

    expect(emailButton).toBeDisabled();
    expect(smsButton).toBeDisabled();
  });
});
