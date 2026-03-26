"use client";

import { lazy, Suspense, useState, useEffect } from "react";
import type { FocusPosition } from "@tiptap/core";
import { Code2, FileCode2, Variable } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EmailPreviewDialog } from "./email-preview-dialog";
import { CodeEditorWithFormat } from "./code-editor-with-format";
import { FontSelector } from "./font-selector";
import { EmailEditorSkeleton } from "./email-editor-skeleton";

// Import editor and default commands
import {
  Editor as MailyEditorComponent,
  DEFAULT_SLASH_COMMANDS,
} from "@reachdem/email-ui";

// Lazy load the editor
const MailyEditor = lazy(() =>
  Promise.resolve({ default: MailyEditorComponent })
);

// Type for the editor from maily-to/core (uses @tiptap v2)
type MailyEditor = any;

export type EmailMode = "visual" | "html" | "react";

// Common variables
const COMMON_VARIABLES = [
  { label: "First Name", value: "{{contact.firstName}}" },
  { label: "Last Name", value: "{{contact.lastName}}" },
  { label: "Full Name", value: "{{contact.name}}" },
  { label: "Email", value: "{{contact.email}}" },
  { label: "Phone", value: "{{contact.phone}}" },
  { label: "Company", value: "{{contact.company}}" },
];

export interface EmailContent {
  subject: string;
  body: string;
  bodyJson?: any; // TipTap JSON content for visual mode
  mode: EmailMode;
  fontFamily?: string;
  fontWeights?: number[];
}

interface EmailComposerProps {
  value: EmailContent;
  onChange: (value: EmailContent) => void;
  disabled?: boolean;
}

export function EmailComposer({
  value,
  onChange,
  disabled = false,
}: EmailComposerProps) {
  const [editor, setEditor] = useState<MailyEditor | null>(null);
  const [isEditorLoading, setIsEditorLoading] = useState(true);

  // Apply font to editor when font changes
  const applyFontToEditor = (fontFamily: string) => {
    if (typeof document !== "undefined") {
      const editorElement = document.querySelector("#mly-editor .ProseMirror");
      if (editorElement) {
        (editorElement as HTMLElement).style.fontFamily =
          `'${fontFamily}', Helvetica, Arial, sans-serif`;
      }

      // Also update all text elements in the editor
      const textElements = document.querySelectorAll(
        "#mly-editor .ProseMirror p, #mly-editor .ProseMirror h1, #mly-editor .ProseMirror h2, #mly-editor .ProseMirror h3, #mly-editor .ProseMirror span, #mly-editor .ProseMirror div"
      );
      textElements.forEach((el) => {
        (el as HTMLElement).style.fontFamily =
          `'${fontFamily}', Helvetica, Arial, sans-serif`;
      });
    }
  };

  // Apply font when editor is ready or font changes
  useEffect(() => {
    if (!isEditorLoading && value.fontFamily) {
      // Wait a bit for the editor to be fully rendered
      setTimeout(() => {
        applyFontToEditor(value.fontFamily || "Inter");
      }, 100);
    }
  }, [isEditorLoading, value.fontFamily]);

  // Inject dynamic font style
  useEffect(() => {
    if (value.fontFamily) {
      const styleId = "dynamic-editor-font";
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = `
        #mly-editor .ProseMirror,
        #mly-editor .ProseMirror * {
          font-family: '${value.fontFamily}', Helvetica, Arial, sans-serif !important;
        }
      `;
    }
  }, [value.fontFamily]);

  const handleSubjectChange = (subject: string) => {
    onChange({ ...value, subject });
  };

  const handleBodyChange = (body: string) => {
    onChange({ ...value, body });
  };

  const handleModeChange = async (mode: string) => {
    if (mode && mode !== value.mode) {
      // When switching to HTML mode, generate full HTML with structure
      if (mode === "html" && value.mode === "visual" && value.body) {
        try {
          const response = await fetch("/api/campaigns/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              htmlContent: value.body, // Pass HTML directly
              fontFamily: value.fontFamily || "Inter",
              fontWeights: value.fontWeights || [400, 600, 700],
            }),
          });

          if (response.ok) {
            const { html } = await response.json();
            onChange({ ...value, mode: mode as EmailMode, body: html });
            return;
          }
        } catch (error) {
          console.error("Failed to generate full HTML:", error);
        }
      }

      onChange({ ...value, mode: mode as EmailMode });
    }
  };

  const handleFontChange = (fontFamily: string) => {
    onChange({ ...value, fontFamily });
    // Apply font to editor immediately
    applyFontToEditor(fontFamily);
  };

  const handleEditorUpdate = (editor: MailyEditor) => {
    const html = editor.getHTML();
    const json = editor.getJSON();
    onChange({
      ...value,
      body: html,
      bodyJson: json,
    });
  };

  const insertVariableInEditor = (variable: string) => {
    if (editor && value.mode === "visual") {
      editor.chain().focus().insertContent(variable).run();
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      {/* Subject Field */}
      <div className="space-y-2">
        <Label htmlFor="email-subject">Subject</Label>
        <Input
          id="email-subject"
          placeholder="Enter email subject..."
          value={value.subject}
          onChange={(e) => handleSubjectChange(e.target.value)}
          disabled={disabled}
          maxLength={200}
          className="w-max-2xl border-none xl:w-3/4"
        />
      </div>

      {/* Mode Selector, Font Selector and Preview Button */}
      <div className="mt-8 flex items-end justify-between gap-4">
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={value.mode}
            onValueChange={handleModeChange}
            disabled={disabled}
          >
            <ToggleGroupItem value="visual" aria-label="Visual Editor">
              Rich Text
            </ToggleGroupItem>
            <ToggleGroupItem value="react" aria-label="React Email">
              <FileCode2 className="mr-2 h-4 w-4" />
              React
              <span className="ml-1.5 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-cyan-600 uppercase">
                Beta
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem value="html" aria-label="HTML Code">
              <Code2 className="mr-2 h-4 w-4" />
              HTML
            </ToggleGroupItem>
          </ToggleGroup>

          {value.mode === "visual" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-2"
                  disabled={disabled}
                >
                  <Variable className="h-4 w-4" />
                  Insert Variable
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Insert Variable</p>
                  <div className="grid gap-2">
                    {COMMON_VARIABLES.map((variable) => (
                      <Button
                        key={variable.value}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-start font-mono text-xs"
                        onClick={() => insertVariableInEditor(variable.value)}
                      >
                        {variable.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex">
          <div className="">
            <FontSelector
              value={value.fontFamily || "Inter"}
              onChange={handleFontChange}
            />
          </div>

          <EmailPreviewDialog
            subject={value.subject}
            htmlContent={value.body}
            bodyJson={value.bodyJson}
            disabled={disabled || !value.body}
            fontFamily={value.fontFamily}
            fontWeights={value.fontWeights}
          />
        </div>
      </div>

      {/* Editor Content */}
      <div className="mt-2">
        {value.mode === "visual" && (
          <div className="rounded-lg">
            {isEditorLoading && <EmailEditorSkeleton />}
            <Suspense fallback={<EmailEditorSkeleton />}>
              <MailyEditor
                blocks={DEFAULT_SLASH_COMMANDS}
                config={{
                  hasMenuBar: false,
                  wrapClassName: cn("editor-wrap", isEditorLoading && "hidden"),
                  bodyClassName: "!mt-2 !border-0 !p-0",
                  contentClassName:
                    "editor-content mx-auto max-w-[calc(600px+80px)] px-10 pb-10",
                  toolbarClassName: "flex-wrap !items-start",
                  spellCheck: false,
                  autofocus: "end" as FocusPosition,
                  immediatelyRender: false,
                }}
                contentJson={value.bodyJson || null}
                onCreate={(editor: MailyEditor) => {
                  setIsEditorLoading(false);
                  setEditor(editor);
                  handleEditorUpdate(editor);
                }}
                onUpdate={(editor: MailyEditor) => {
                  setEditor(editor);
                  handleEditorUpdate(editor);
                }}
              />
            </Suspense>
          </div>
        )}

        {value.mode === "html" && (
          <CodeEditorWithFormat
            value={value.body}
            onChange={handleBodyChange}
            disabled={disabled}
            language="html"
            placeholder="Enter HTML code for your email..."
          />
        )}

        {value.mode === "react" && (
          <CodeEditorWithFormat
            value={value.body}
            onChange={handleBodyChange}
            disabled={disabled}
            language="tsx"
            placeholder="Enter React Email template code..."
          />
        )}
      </div>
    </div>
  );
}
