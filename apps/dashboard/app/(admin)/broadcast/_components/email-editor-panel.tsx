"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { EmailEditor, type EmailEditorRef } from "@react-email/editor";
import { BubbleMenu } from "@react-email/editor/ui";
import "@react-email/editor/themes/default.css";
import "@react-email/editor/styles/bubble-menu.css";
import "@react-email/editor/styles/slash-command.css";
import "@react-email/editor/styles/inspector.css";

import { sendEmailBroadcast } from "../_actions/broadcast";
import { BlockSidebar } from "./block-sidebar";
import { EditorInspector } from "./editor-inspector";
import {
  EditorToolbar,
  type EditorViewMode,
  type DeviceMode,
} from "./editor-toolbar";
import { cn } from "@/lib/utils";

interface Props {
  adminEmail: string;
}

export function EmailEditorPanel({ adminEmail }: Props) {
  const editorRef = useRef<EmailEditorRef>(null);
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("ReachDem");
  const [viewMode, setViewMode] = useState<EditorViewMode>("editor");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [htmlPreview, setHtmlPreview] = useState("");
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    broadcastId?: string;
    sent?: number;
  } | null>(null);

  async function handleViewChange(mode: EditorViewMode) {
    if (mode === "html" || mode === "preview") {
      const editor = editorRef.current;
      if (editor) {
        const html = await editor.getEmailHTML();
        setHtmlPreview(html);
      }
    }
    setViewMode(mode);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    const editor = editorRef.current;
    if (!editor) return;

    const [emailResult, json] = await Promise.all([
      editor.getEmail(),
      Promise.resolve(editor.getJSON()),
    ]);

    startTransition(async () => {
      const res = await sendEmailBroadcast({
        subject,
        bodyHtml: emailResult.html,
        bodyJson: json as Record<string, unknown>,
        fromName,
        sentBy: adminEmail,
      });
      if ("error" in res && res.error) {
        setResult({ error: res.error });
      } else if ("broadcastId" in res) {
        setResult({
          success: true,
          broadcastId: res.broadcastId,
          sent: res.sent,
        });
      }
    });
  }

  const canvasWidth = deviceMode === "desktop" ? "600px" : "375px";

  return (
    <form
      onSubmit={handleSend}
      className="border-border bg-background flex h-[calc(100vh-280px)] min-h-[600px] flex-col overflow-hidden rounded-xl border"
    >
      {/* Top: Subject + From fields */}
      <div className="border-border grid grid-cols-1 gap-3 border-b px-4 py-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="text-foreground/70 mb-1 block text-[11px] font-medium">
            Subject
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your message subject…"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-1.5 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-foreground/70 mb-1 block text-[11px] font-medium">
            From name
          </label>
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            className="border-input bg-background text-foreground w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar
        viewMode={viewMode}
        deviceMode={deviceMode}
        onViewModeChange={handleViewChange}
        onDeviceModeChange={setDeviceMode}
      />

      {/* 3-panel editor body */}
      <div className="flex flex-1 overflow-hidden">
        <EmailEditor
          ref={editorRef}
          placeholder="Start composing your email…"
          className="flex flex-1 overflow-hidden"
        >
          {/* Left: Block palette */}
          {viewMode === "editor" && <BlockSidebar />}

          {/* Center: Canvas */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {viewMode === "editor" && (
              <div className="bg-muted/30 relative flex-1 overflow-y-auto p-6">
                <div
                  className="mx-auto rounded-sm bg-white shadow-sm transition-[max-width] duration-300"
                  style={{ maxWidth: canvasWidth, minHeight: "400px" }}
                >
                  {/* The editor content renders here via TipTap's EditorContent */}
                  <div
                    className="re-editor-content p-6"
                    data-re-editable="true"
                  />
                </div>
              </div>
            )}

            {viewMode === "html" && (
              <div className="flex-1 overflow-auto p-4">
                <pre className="bg-muted text-foreground/80 rounded-md p-4 font-mono text-xs whitespace-pre-wrap">
                  {htmlPreview || "Send preview to generate HTML…"}
                </pre>
              </div>
            )}

            {viewMode === "preview" && (
              <div className="bg-muted/30 flex-1 overflow-auto p-6">
                <div
                  className="mx-auto rounded-sm bg-white shadow-sm"
                  style={{ maxWidth: canvasWidth }}
                >
                  <div
                    className="p-6"
                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Inspector */}
          {viewMode === "editor" && <EditorInspector />}

          {/* Bubble menus */}
          <BubbleMenu>
            <BubbleMenu.NodeSelector />
            <BubbleMenu.Separator />
            <BubbleMenu.Bold />
            <BubbleMenu.Italic />
            <BubbleMenu.Underline />
            <BubbleMenu.Strike />
            <BubbleMenu.Separator />
            <BubbleMenu.LinkSelector />
            <BubbleMenu.Separator />
            <BubbleMenu.AlignLeft />
            <BubbleMenu.AlignCenter />
            <BubbleMenu.AlignRight />
          </BubbleMenu>
        </EmailEditor>
      </div>

      {/* Footer: Result + Send */}
      <div className="border-border flex items-center justify-between border-t px-4 py-3">
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground text-xs">
            Sent via SMTP to all verified users
          </p>
          {result && (
            <span
              className={cn(
                "rounded-full px-3 py-0.5 text-xs font-medium",
                result.success
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
              )}
            >
              {result.success
                ? `Sent to ${result.sent} recipients`
                : result.error}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending || !subject.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send broadcast"}
        </button>
      </div>
    </form>
  );
}
