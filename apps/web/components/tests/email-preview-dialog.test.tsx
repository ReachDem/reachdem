import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailPreviewDialog } from "../campaigns/email-preview-dialog";

describe("EmailPreviewDialog", () => {
  it("renders preview button", () => {
    render(
      <EmailPreviewDialog
        subject="Test Subject"
        htmlContent="<p>Test content</p>"
      />
    );

    expect(
      screen.getByRole("button", { name: /preview/i })
    ).toBeInTheDocument();
  });

  it("disables button when disabled prop is true", () => {
    render(
      <EmailPreviewDialog
        subject="Test Subject"
        htmlContent="<p>Test content</p>"
        disabled={true}
      />
    );

    expect(screen.getByRole("button", { name: /preview/i })).toBeDisabled();
  });

  it("disables button when no content", () => {
    render(
      <EmailPreviewDialog
        subject="Test Subject"
        htmlContent=""
        disabled={false}
      />
    );

    expect(screen.getByRole("button", { name: /preview/i })).toBeDisabled();
  });
});
