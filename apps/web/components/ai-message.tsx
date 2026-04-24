"use client";

import type { ComponentPropsWithoutRef } from "react";
import { memo, useState } from "react";
import {
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  IconSparkles,
  IconCheck,
  IconX,
  IconLoader2,
} from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AIApprovalCard } from "@/components/ai-approval-card";
import type { ChatMessage } from "@/hooks/use-ai-chat";
import type {
  AITableData,
  AISuggestedAction,
  AIStepTrace,
  AIToolExecutionRecord,
  PendingApproval,
} from "@/lib/ai/types";

// ── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_LABEL: Record<string, string> = {
  gemini: "Powered by Gemini",
  openai: "Powered by OpenAI",
};

// ── Markdown renderer ─────────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }: ComponentPropsWithoutRef<"p">) => (
          <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
        ),
        strong: ({ children }: ComponentPropsWithoutRef<"strong">) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }: ComponentPropsWithoutRef<"em">) => (
          <em className="italic">{children}</em>
        ),
        ul: ({ children }: ComponentPropsWithoutRef<"ul">) => (
          <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }: ComponentPropsWithoutRef<"ol">) => (
          <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }: ComponentPropsWithoutRef<"li">) => (
          <li className="leading-relaxed">{children}</li>
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code: ({ inline, children, ...props }: any) =>
          inline ? (
            <code
              className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.8em] dark:bg-white/15"
              {...props}
            >
              {children}
            </code>
          ) : (
            <pre className="my-2 overflow-x-auto rounded-lg bg-black/10 p-3 font-mono text-xs dark:bg-white/10">
              <code {...props}>{children}</code>
            </pre>
          ),
        blockquote: ({ children }: ComponentPropsWithoutRef<"blockquote">) => (
          <blockquote className="my-2 border-l-2 border-current pl-3 opacity-70">
            {children}
          </blockquote>
        ),
        a: ({ href, children }: ComponentPropsWithoutRef<"a">) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            {children}
          </a>
        ),
        h1: ({ children }: ComponentPropsWithoutRef<"h1">) => (
          <p className="mb-1 text-sm font-semibold">{children}</p>
        ),
        h2: ({ children }: ComponentPropsWithoutRef<"h2">) => (
          <p className="mb-1 text-sm font-semibold">{children}</p>
        ),
        h3: ({ children }: ComponentPropsWithoutRef<"h3">) => (
          <p className="mb-1 text-sm font-medium">{children}</p>
        ),
        hr: () => <hr className="my-2 border-current opacity-20" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/**
 * Single-line truncated summary shown above a data table.
 * Strips list items and shows only the first meaningful sentence.
 */
function TruncatedContent({ content }: { content: string }) {
  // Grab the first non-empty line that isn't a markdown list item
  const summary =
    content
      .split("\n")
      .map((l) => l.replace(/^[\s*\-\d.]+/, "").trim())
      .find((l) => l.length > 0) ?? content;

  const truncated =
    summary.length > 120 ? summary.slice(0, 117).trimEnd() + "…" : summary;

  return <p className="text-sm leading-relaxed">{truncated}</p>;
}

// ── Tool call trace ───────────────────────────────────────────────────────────

const toolStatusIcon = {
  success: <IconCheck className="h-3 w-3 text-emerald-500" stroke={2.5} />,
  error: <IconX className="text-destructive h-3 w-3" stroke={2.5} />,
  pending_approval: (
    <IconLoader2 className="h-3 w-3 animate-spin text-amber-500" stroke={2} />
  ),
  skipped: <IconX className="text-muted-foreground/50 h-3 w-3" stroke={2} />,
};

function AIToolTrace({ toolCalls }: { toolCalls: AIToolExecutionRecord[] }) {
  const [open, setOpen] = useState(false);

  if (toolCalls.length === 0) return null;

  const summary = toolCalls.map((tc) => tc.label ?? tc.capability).join(" · ");

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground/70 hover:text-muted-foreground flex items-center gap-1 text-[11px] transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span className="max-w-[280px] truncate">{summary}</span>
      </button>

      {open && (
        <div className="border-border mt-1.5 space-y-1 border-l pl-4">
          {toolCalls.map((tc, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {toolStatusIcon[tc.status]}
              <span className="text-muted-foreground text-[11px]">
                {tc.label ?? `${tc.capability} · ${tc.status}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step trace chain ──────────────────────────────────────────────────────────

const stepStatusIcon = {
  success: (
    <IconCheck className="h-3 w-3 shrink-0 text-emerald-500" stroke={2.5} />
  ),
  error: <IconX className="text-destructive h-3 w-3 shrink-0" stroke={2.5} />,
  pending: (
    <IconLoader2
      className="h-3 w-3 shrink-0 animate-spin text-amber-500"
      stroke={2}
    />
  ),
};

function AIStepTraceChain({ steps }: { steps: AIStepTrace[] }) {
  const [open, setOpen] = useState(false);
  if (!steps || steps.length === 0) return null;

  const lastError = steps.find((s) => s.status === "error");
  const allDone = steps.every((s) => s.status !== "pending");

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground/70 hover:text-muted-foreground flex items-center gap-1 text-[11px] transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span className="max-w-[280px] truncate">
          {lastError
            ? `Erreur : ${lastError.label}`
            : allDone
              ? `${steps.length} étape${steps.length !== 1 ? "s" : ""} complétée${steps.length !== 1 ? "s" : ""}`
              : "En cours…"}
        </span>
      </button>
      {open && (
        <div className="border-border mt-1.5 space-y-1 border-l pl-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {stepStatusIcon[step.status]}
              <span className="text-muted-foreground text-[11px] leading-snug">
                {step.label}
                {step.detail && (
                  <span className="text-muted-foreground/60">
                    {" "}
                    — {step.detail}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Data table ────────────────────────────────────────────────────────────────

function AIDataTable({ data }: { data: AITableData }) {
  const { columns, rows, total, truncated } = data;

  if (rows.length === 0) {
    return (
      <div className="border-border bg-background/50 text-muted-foreground rounded-xl border px-4 py-3 text-xs">
        Aucun résultat trouvé.
      </div>
    );
  }

  return (
    <div className="border-border bg-background/50 w-full overflow-hidden rounded-xl border">
      {/* header */}
      {total !== undefined && (
        <div className="border-border flex items-center justify-between border-b px-3 py-2">
          <span className="text-muted-foreground text-[11px] font-medium">
            {total} résultat{total !== 1 ? "s" : ""}
            {truncated ? ` · affichage des ${rows.length} premiers` : ""}
          </span>
        </div>
      )}

      {/* table — scrollable both axes, max height */}
      <div className="max-h-56 overflow-x-auto overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-border bg-muted/40 border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-muted-foreground px-3 py-2 text-left font-medium"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={(row.id as string) ?? i}
                className="border-border/50 hover:bg-muted/30 border-b transition-colors last:border-0"
              >
                {columns.map((col) => {
                  const val = row[col.key];
                  return (
                    <td key={col.key} className="text-foreground/80 px-3 py-2">
                      {val == null || val === "" ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Suggested actions ─────────────────────────────────────────────────────────

interface AISuggestedActionsProps {
  actions: AISuggestedAction[];
  onSendMessage?: (msg: string) => void;
}

function AISuggestedActions({
  actions,
  onSendMessage,
}: AISuggestedActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action, i) =>
        action.href ? (
          <a
            key={i}
            href={action.href}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {action.label}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : action.message ? (
          <button
            key={i}
            type="button"
            onClick={() => onSendMessage?.(action.message!)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {action.label}
          </button>
        ) : null
      )}
    </div>
  );
}

// ── Main message component ────────────────────────────────────────────────────

interface AIMessageProps {
  message: ChatMessage;
  onApprove?: (approval: PendingApproval) => void;
  onDismissApproval?: (id: string) => void;
  onSendMessage?: (msg: string) => void;
  isLoading?: boolean;
}

export const AIMessage = memo(function AIMessage({
  message,
  onApprove,
  onDismissApproval,
  onSendMessage,
  isLoading,
}: AIMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 text-sm",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted text-muted-foreground border-border"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-col gap-2",
          isUser
            ? "max-w-[85%] items-end"
            : message.tableData || (message.pendingApprovals?.length ?? 0) > 0
              ? "w-full max-w-[320px] items-start"
              : "max-w-[85%] items-start"
        )}
      >
        {/* text bubble */}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 break-words",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm",
            // constrain bubble width when column is capped
            !isUser &&
              (message.tableData || (message.pendingApprovals?.length ?? 0) > 0)
              ? "max-w-full"
              : ""
          )}
        >
          {isUser ? (
            <p className="leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : message.tableData ? (
            <TruncatedContent content={message.content} />
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>

        {/* data table */}
        {!isUser && message.tableData && (
          <div className="w-full overflow-x-auto">
            <AIDataTable data={message.tableData} />
          </div>
        )}

        {/* suggested actions */}
        {!isUser &&
          message.suggestedActions &&
          message.suggestedActions.length > 0 && (
            <AISuggestedActions
              actions={message.suggestedActions}
              onSendMessage={onSendMessage}
            />
          )}

        {/* pending approvals */}
        {!isUser &&
          message.pendingApprovals &&
          message.pendingApprovals.length > 0 && (
            <div className="w-full space-y-2">
              {message.pendingApprovals.map((ap) => (
                <AIApprovalCard
                  key={ap.id}
                  approval={ap}
                  onApprove={onApprove ?? (() => {})}
                  onDismiss={onDismissApproval ?? (() => {})}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}

        {/* tool trace + step trace + Hermes badge */}
        {!isUser && (
          <div className="flex w-full flex-col gap-1 pl-0.5">
            {message.stepTrace && message.stepTrace.length > 0 && (
              <AIStepTraceChain steps={message.stepTrace} />
            )}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <AIToolTrace toolCalls={message.toolCalls} />
            )}
            {message.providerUsed && (
              <div className="flex items-center gap-1">
                <IconSparkles
                  className="text-muted-foreground/60 h-3 w-3"
                  stroke={1.5}
                />
                <span className="text-muted-foreground text-[11px]">
                  Hermes
                </span>
                <span className="text-muted-foreground/40 text-[11px]">·</span>
                <span className="text-muted-foreground/50 text-[11px]">
                  {PROVIDER_LABEL[message.providerUsed] ??
                    `Powered by ${message.providerUsed}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ── Typing / thinking indicator ───────────────────────────────────────────────

interface AITypingIndicatorProps {
  /** Current step label shown while the AI works */
  label?: string | null;
}

export function AITypingIndicator({ label }: AITypingIndicatorProps = {}) {
  return (
    <div className="flex gap-3 text-sm">
      <div className="bg-muted text-muted-foreground border-border flex h-7 w-7 shrink-0 items-center justify-center rounded-full border">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="bg-muted flex items-center rounded-2xl rounded-tl-sm px-4 py-3">
          <span className="flex gap-1">
            <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full" />
          </span>
        </div>
        {label && (
          <p className="text-muted-foreground/70 pl-1 text-[11px] italic">
            {label}
          </p>
        )}
      </div>
    </div>
  );
}
