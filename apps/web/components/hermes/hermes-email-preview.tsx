"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Code2, Maximize2, Edit3, Check } from "lucide-react";
import JsxParserComponent from "react-jsx-parser";

// ── Simple safe component map for email JSX ───────────────────────────────────
// Only allow basic HTML-like tags to prevent XSS
const EMAIL_COMPONENTS = {} as Record<string, React.ComponentType<unknown>>;
const JsxParser = JsxParserComponent as unknown as React.ComponentType<any>;

interface HermesEmailPreviewProps {
  jsx: string;
  subject?: string;
  onJsxChange?: (newJsx: string) => void;
  readOnly?: boolean;
}

type ViewMode = "preview" | "code";

export function HermesEmailPreview({
  jsx,
  subject,
  onJsxChange,
  readOnly = false,
}: HermesEmailPreviewProps) {
  const [mode, setMode] = useState<ViewMode>("preview");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(jsx);
  const [editing, setEditing] = useState(false);

  const handleSaveDraft = useCallback(() => {
    onJsxChange?.(draft);
    setEditing(false);
  }, [draft, onJsxChange]);

  return (
    <div className="space-y-2">
      {/* Inline preview */}
      <div className="bg-background overflow-hidden rounded-md border">
        {/* Toolbar */}
        <div className="bg-muted/40 flex items-center gap-1 border-b px-2 py-1">
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-0.5 text-[11px]",
              mode === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3 w-3" /> Aperçu
          </button>
          <button
            type="button"
            onClick={() => setMode("code")}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-0.5 text-[11px]",
              mode === "code"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code2 className="h-3 w-3" /> JSX
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-[11px]"
          >
            <Maximize2 className="h-3 w-3" /> Agrandir
          </button>
        </div>

        {/* Content */}
        <div className="max-h-48 overflow-y-auto p-3 text-sm">
          {mode === "preview" ? (
            <EmailJsxRenderer jsx={jsx} />
          ) : (
            <pre className="text-muted-foreground font-mono text-[11px] break-all whitespace-pre-wrap">
              {jsx}
            </pre>
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 pt-5 pb-4">
            <DialogTitle className="text-base">
              {subject ? `Email — ${subject}` : "Aperçu de l'email"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {editing && !readOnly ? (
              <div className="space-y-2 p-4">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-96 font-mono text-xs"
                  placeholder="JSX de l'email…"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDraft(jsx);
                      setEditing(false);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleSaveDraft}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Appliquer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <EmailJsxRenderer jsx={onJsxChange ? draft : jsx} />
              </div>
            )}
          </div>

          {!readOnly && !editing && (
            <div className="flex shrink-0 justify-end border-t px-6 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                Modifier le JSX
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── JSX renderer (safe) ───────────────────────────────────────────────────────

function EmailJsxRenderer({ jsx }: { jsx: string }) {
  try {
    return (
      <div className="email-preview text-sm leading-relaxed">
        <JsxParser
          jsx={jsx}
          components={EMAIL_COMPONENTS}
          renderInWrapper={false}
          showWarnings={false}
          onError={() => null}
        />
      </div>
    );
  } catch {
    return (
      <pre className="text-muted-foreground text-xs break-all whitespace-pre-wrap">
        {jsx}
      </pre>
    );
  }
}
