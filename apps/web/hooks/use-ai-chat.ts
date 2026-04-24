"use client";

import { useState, useCallback, useRef } from "react";
import type {
  AIChatResponse,
  AIPageContext,
  AIStepTrace,
  AITableData,
  AISuggestedAction,
  PendingApproval,
} from "@/lib/ai/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: AIChatResponse["toolCalls"];
  pendingApprovals?: PendingApproval[];
  providerUsed?: AIChatResponse["providerUsed"];
  contextSummary?: string[];
  tableData?: AITableData;
  suggestedActions?: AISuggestedAction[];
  stepTrace?: AIStepTrace[];
  /** Opaque flow state echoed back on next turn */
  campaignFlowState?: AIChatResponse["campaignFlowState"];
  timestamp: Date;
}

interface UseAIChatOptions {
  page?: AIPageContext;
}

/** Quick client-side guess for what the AI is about to do (shown during loading) */
function guessThinkingStep(message: string): string {
  if (
    /(contact|client|prospect|garçon|garcon|homme|hommes|femme|femmes|fille|filles|gens|personne)/i.test(
      message
    )
  )
    return "Recherche des contacts…";
  if (/(campaign|campagne)/i.test(message)) return "Chargement des campagnes…";
  if (/(message|sms|email)/i.test(message)) return "Consultation des messages…";
  return "Réflexion en cours…";
}

function buildAssistantMessage(data: AIChatResponse): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: data.text,
    toolCalls: data.toolCalls,
    pendingApprovals: data.pendingApprovals,
    providerUsed: data.providerUsed,
    contextSummary: data.contextSummary,
    tableData: data.tableData,
    suggestedActions: data.suggestedActions,
    stepTrace: data.stepTrace,
    campaignFlowState: data.campaignFlowState,
    timestamp: new Date(),
  };
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | undefined>(undefined);
  // Ref so sendMessage can always read latest messages without being in its dep array
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setThinkingStep(guessThinkingStep(content));
      setError(null);

      try {
        // Find the most recent assistant message that has table results
        const lastTableMsg = [...messagesRef.current]
          .reverse()
          .find(
            (m) =>
              m.role === "assistant" &&
              m.tableData &&
              (m.tableData.rows?.length ?? 0) > 0
          );

        // Determine whether the last table was contacts or campaigns
        const lastTableIsContacts = lastTableMsg?.tableData?.columns.some(
          (c) => c.key === "phone"
        );
        const lastTableIsCampaigns = lastTableMsg?.tableData?.columns.some(
          (c) => c.key === "status" && !lastTableIsContacts
        );

        // Build a text summary of the last table so the LLM can reference it in follow-ups
        const tableContextLines: string[] = [];
        if (lastTableMsg?.tableData) {
          const rows = lastTableMsg.tableData.rows;
          if (lastTableIsContacts) {
            tableContextLines.push(
              `[Previous results: ${rows.length} contacts — ${rows.map((r) => r.name ?? r.id).join(", ")}]`
            );
          } else if (lastTableIsCampaigns) {
            tableContextLines.push(
              `[Previous results: ${rows.length} campaigns — ${rows.map((r) => r.name).join(", ")}]`
            );
          }
        }

        // Inject table context as a synthetic assistant note at the start of history
        const rawHistory = messagesRef.current
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }));
        const history =
          tableContextLines.length > 0
            ? [
                {
                  role: "assistant" as const,
                  content: tableContextLines.join("\n"),
                },
                ...rawHistory,
              ]
            : rawHistory;

        // Find the most recent campaign flow state to echo back
        const lastFlowMsg = [...messagesRef.current]
          .reverse()
          .find((m) => m.role === "assistant" && m.campaignFlowState);

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationId: conversationId.current,
            page: options.page,
            history,
            recentContactIds: lastTableIsContacts
              ? lastTableMsg?.tableData?.rows.map((r) => r.id as string)
              : undefined,
            recentContactTotal: lastTableIsContacts
              ? (lastTableMsg?.tableData?.total ??
                lastTableMsg?.tableData?.rows.length)
              : undefined,
            recentCampaignIds: lastTableIsCampaigns
              ? lastTableMsg?.tableData?.rows.map((r) => r.id as string)
              : undefined,
            recentTableData: lastTableMsg?.tableData ?? undefined,
            campaignFlowState: lastFlowMsg?.campaignFlowState,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || "Request failed");
        }

        const data: AIChatResponse = await res.json();
        setMessages((prev) => [...prev, buildAssistantMessage(data)]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
        setThinkingStep(null);
      }
    },
    [isLoading, options.page]
  );

  const approveAction = useCallback(
    async (approval: PendingApproval) => {
      setIsLoading(true);
      setThinkingStep("Exécution de l'action…");
      setError(null);
      try {
        // For channelChoice, the flow state lives on the last assistant message
        const lastFlowMsg = [...messagesRef.current]
          .reverse()
          .find((m) => m.role === "assistant" && m.campaignFlowState);

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `[Approved] ${approval.summary}`,
            conversationId: conversationId.current,
            page: options.page,
            requestedAction: {
              capability: approval.capability,
              summary: approval.summary,
              targetLabel: approval.targetLabel,
              input: approval.input,
            },
            campaignFlowState:
              approval.kind === "channelChoice"
                ? {
                    ...(lastFlowMsg?.campaignFlowState ?? {}),
                    step: "awaitingChannel",
                    channel: (approval.input as Record<string, unknown>)
                      ?.channel as "sms" | "email" | undefined,
                  }
                : lastFlowMsg?.campaignFlowState,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || "Request failed");
        }

        const data: AIChatResponse = await res.json();
        setMessages((prev) => [...prev, buildAssistantMessage(data)]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
        setThinkingStep(null);
      }
    },
    [isLoading, options.page]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationId.current = undefined;
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    thinkingStep,
    error,
    sendMessage,
    approveAction,
    clearMessages,
  };
}
