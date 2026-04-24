"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AIPageContext } from "@/lib/ai/types";

// -- Types ---------------------------------------------------------------------

export interface HermesMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pendingApprovals?: HermesPendingApproval[];
  timestamp: Date;
}

export interface HermesPendingApproval {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  dismissed?: boolean;
  approved?: boolean;
  result?: unknown;
  error?: string;
}

export type HermesChatStatus = "idle" | "loading" | "streaming" | "error";

export interface UseHermesChatOptions {
  page?: AIPageContext;
}

export const WRITE_TOOLS = new Set([
  "create_group",
  "update_group",
  "delete_group",
  "create_campaign",
  "update_campaign",
  "delete_campaign",
  "send_sms",
  "send_email",
  "craft_email",
]);

const COMPACTION_THRESHOLD = 8;

// Matches [[APPROVAL:{"id":"...","toolName":"...","args":{...}}]]
const APPROVAL_RE = /\[\[APPROVAL:(\{[\s\S]*?\})\]\]/g;

function extractApprovals(text: string): HermesPendingApproval[] {
  const results: HermesPendingApproval[] = [];
  APPROVAL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = APPROVAL_RE.exec(text)) !== null) {
    try {
      const p = JSON.parse(m[1]) as {
        id?: string;
        toolName?: string;
        args?: Record<string, unknown>;
      };
      if (p.id && p.toolName) {
        results.push({ id: p.id, toolName: p.toolName, args: p.args ?? {} });
      }
    } catch {
      /* skip malformed */
    }
  }
  return results;
}

function stripMarkers(text: string): string {
  return text
    .replace(/\[\[APPROVAL:\{[\s\S]*?\}\]\]/g, "")
    .replace(/\[\[NAVIGATE:[^\]]+\]\]/g, "")
    .trim();
}

// -- Hook ---------------------------------------------------------------------

export function useHermesChat(options: UseHermesChatOptions = {}) {
  const router = useRouter();
  const [messages, setMessages] = useState<HermesMessage[]>([]);
  const [status, setStatus] = useState<HermesChatStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const conversationSummaryRef = useRef<string | undefined>(undefined);
  const turnCountRef = useRef(0);
  const isCompactingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<HermesMessage[]>([]);
  messagesRef.current = messages;

  const triggerCompaction = useCallback(async () => {
    if (isCompactingRef.current) return;
    isCompactingRef.current = true;
    try {
      const history = messagesRef.current
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/chat/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history,
          previousSummary: conversationSummaryRef.current,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { summary: string };
        conversationSummaryRef.current = data.summary;
      }
    } catch {
      /* best-effort */
    } finally {
      isCompactingRef.current = false;
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status === "loading" || status === "streaming") return;
      setError(null);
      const userMsg: HermesMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setStatus("loading");
      const history = messagesRef.current
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
      abortControllerRef.current = new AbortController();
      try {
        const res = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history,
            page: options.page,
            conversationSummary: conversationSummaryRef.current,
          }),
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed: ${res.status}`);
        }
        const assistantId = crypto.randomUUID();
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
          },
        ]);
        setStatus("streaming");
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const visibleSoFar = stripMarkers(accumulated);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: visibleSoFar } : m
            )
          );
        }

        const approvals = extractApprovals(accumulated);
        const navMatch = accumulated.match(/\[\[NAVIGATE:([^\]]+)\]\]/);
        if (navMatch) router.push(navMatch[1]);
        const finalText = stripMarkers(accumulated);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: finalText,
                  pendingApprovals: approvals.length ? approvals : undefined,
                }
              : m
          )
        );
        setStatus("idle");
        turnCountRef.current += 1;
        if (turnCountRef.current % COMPACTION_THRESHOLD === 0)
          triggerCompaction();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("idle");
          return;
        }
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        setStatus("error");
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Une erreur est survenue. Veuillez reessayer.",
            timestamp: new Date(),
          },
        ]);
      }
    },
    [status, options.page, router, triggerCompaction]
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus("idle");
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    conversationSummaryRef.current = undefined;
    turnCountRef.current = 0;
  }, []);

  const dismissApproval = useCallback(
    (messageId: string, approvalId: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                pendingApprovals: m.pendingApprovals?.map((a) =>
                  a.id === approvalId ? { ...a, dismissed: true } : a
                ),
              }
            : m
        )
      );
    },
    []
  );

  const markApproved = useCallback(
    async (messageId: string, approvalId: string) => {
      let approval: HermesPendingApproval | undefined;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const updated = m.pendingApprovals?.map((a) => {
            if (a.id !== approvalId) return a;
            approval = a;
            return { ...a, approved: true };
          });
          return { ...m, pendingApprovals: updated };
        })
      );
      if (!approval) return;

      try {
        const res = await fetch("/api/ai/chat/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toolName: approval.toolName,
            args: approval.args,
          }),
        });
        const data = (await res.json()) as { result?: unknown; error?: string };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  pendingApprovals: m.pendingApprovals?.map((a) =>
                    a.id === approvalId
                      ? { ...a, result: data.result, error: data.error }
                      : a
                  ),
                }
              : m
          )
        );
      } catch {
        /* best-effort */
      }
    },
    []
  );

  const isLoading = status === "loading" || status === "streaming";
  return {
    messages,
    status,
    isLoading,
    error,
    sendMessage,
    stop,
    clearMessages,
    dismissApproval,
    markApproved,
    WRITE_TOOLS,
  };
}
