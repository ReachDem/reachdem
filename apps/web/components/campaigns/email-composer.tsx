"use client";

import { lazy, Suspense, useState, useEffect } from "react";
import type { FocusPosition } from "@tiptap/core";
import { Code2, FileCode2, Loader2, Send, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmailPreviewDialog } from "./email-preview-dialog";
import { CodeEditorWithFormat } from "./code-editor-with-format";
import { FontSelector } from "./font-selector";
import { toast } from "sonner";

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

export interface EmailContent {
  subject: string;
  body: string;
  bodyJson?: any; // TipTap JSON content for visual mode
  mode: EmailMode;
  fontFamily?: string;
  fontWeights?: number[];
  fromName?: string;
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
  const [isSendingTest, setIsSendingTest] = useState(false);

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

  const handleFromNameChange = (fromName: string) => {
    onChange({ ...value, fromName });
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

  const handleSendTest = async () => {
    if (!value.subject || !value.body) {
      toast.error("Veuillez remplir le sujet et le contenu de l'email.");
      return;
    }

    setIsSendingTest(true);

    const payload = {
      subject: value.subject,
      htmlContent: value.body,
      fontFamily: value.fontFamily,
      fontWeights: value.fontWeights,
      fromName: value.fromName,
    };

    console.log("[EmailComposer] Sending test email with payload:", payload);

    try {
      const response = await fetch("/api/v1/campaigns/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Échec de l'envoi du test");
      }

      toast.success(data.message);
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer l'email de test"
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      {/* Sender Name and Subject Fields - Side by side on large screens */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* Sender Name Field */}
        <div className="space-y-2">
          <Label htmlFor="email-from-name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Sender Name
          </Label>
          <Input
            id="email-from-name"
            placeholder="ReachDem"
            value={value.fromName || ""}
            onChange={(e) => handleFromNameChange(e.target.value)}
            disabled={disabled}
            maxLength={15}
            className="border-none"
          />
          <p className="text-muted-foreground text-xs">
            {value.fromName
              ? `${value.fromName.length}/15 characters`
              : "Default: ReachDem (max 15 chars)"}
          </p>
        </div>

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
            className="border-none"
          />
          <p className="text-muted-foreground text-xs">
            {value.subject.length}/200 characters
          </p>
        </div>
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
        </div>

        <div className="flex gap-2">
          <div className="">
            <FontSelector
              value={value.fontFamily || "Inter"}
              onChange={handleFontChange}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={
              disabled || !value.subject || !value.body || isSendingTest
            }
          >
            {isSendingTest ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Test
              </>
            )}
          </Button>

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
            {isEditorLoading && (
              <div className="flex w-full items-center justify-center py-10">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            )}
            <Suspense
              fallback={
                <div className="flex w-full items-center justify-center py-10">
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                </div>
              }
            >
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
