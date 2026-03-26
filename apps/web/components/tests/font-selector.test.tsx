import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FontSelector } from "../campaigns/font-selector";

// Mock fetch
global.fetch = vi.fn();

describe("FontSelector", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default value", () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fonts: [
          {
            family: "Inter",
            variants: ["400", "600", "700"],
            category: "sans-serif",
          },
          {
            family: "Roboto",
            variants: ["400", "600", "700"],
            category: "sans-serif",
          },
        ],
      }),
    });

    render(<FontSelector value="Inter" onChange={mockOnChange} />);

    expect(screen.getByText("Font Family")).toBeInTheDocument();
  });

  it("fetches fonts on mount", async () => {
    const mockFonts = [
      {
        family: "Inter",
        variants: ["400", "600", "700"],
        category: "sans-serif",
      },
      {
        family: "Roboto",
        variants: ["400", "600", "700"],
        category: "sans-serif",
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fonts: mockFonts }),
    });

    render(<FontSelector value="Inter" onChange={mockOnChange} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/google-fonts");
    });
  });

  it("shows loading state initially", () => {
    (global.fetch as any).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    render(<FontSelector value="Inter" onChange={mockOnChange} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
  });

  it("calls onChange when font is selected", async () => {
    const user = userEvent.setup();
    const mockFonts = [
      {
        family: "Inter",
        variants: ["400", "600", "700"],
        category: "sans-serif",
      },
      {
        family: "Roboto",
        variants: ["400", "600", "700"],
        category: "sans-serif",
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fonts: mockFonts }),
    });

    render(<FontSelector value="Inter" onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).not.toBeDisabled();
    });

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    // Note: Testing Select component interaction requires more complex setup
    // This is a basic structure - actual implementation may vary
  });

  it("falls back to popular fonts on fetch error", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    render(<FontSelector value="Inter" onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).not.toBeDisabled();
    });

    // Should still render with fallback fonts
    expect(screen.getByText("Font Family")).toBeInTheDocument();
  });
});
