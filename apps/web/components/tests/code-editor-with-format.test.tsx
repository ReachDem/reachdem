import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CodeEditorWithFormat } from "../campaigns/code-editor-with-format";

// Mock Monaco Editor
vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe("CodeEditorWithFormat", () => {
  it("renders with HTML language", () => {
    const onChange = vi.fn();
    render(
      <CodeEditorWithFormat
        value="<div>Test</div>"
        onChange={onChange}
        language="html"
      />
    );

    expect(screen.getByText("HTML")).toBeInTheDocument();
    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
  });

  it("renders with TSX language", () => {
    const onChange = vi.fn();
    render(
      <CodeEditorWithFormat
        value="const test = 'hello';"
        onChange={onChange}
        language="tsx"
      />
    );

    expect(screen.getByText("TSX")).toBeInTheDocument();
  });

  it("shows character count", () => {
    const onChange = vi.fn();
    render(
      <CodeEditorWithFormat
        value="<div>Test</div>"
        onChange={onChange}
        language="html"
      />
    );

    expect(screen.getByText("15 characters")).toBeInTheDocument();
  });

  it("shows copy button", () => {
    const onChange = vi.fn();
    render(
      <CodeEditorWithFormat
        value="<div>Test</div>"
        onChange={onChange}
        language="html"
      />
    );

    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });
});
