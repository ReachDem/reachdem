"use client";

import { memo } from "react";
import type { HermesMessage as HermesMsgType } from "@/hooks/use-hermes-chat";
import { Message, MessageContent } from "@/components/ui/message";
import { Response } from "@/components/ui/response";
import { Orb } from "@/components/ui/orb";
import { HermesApprovalCard } from "./hermes-approval-card";

// -- Main message --------------------------------------------------------------

interface HermesMessageProps {
  message: HermesMsgType;
  isStreaming?: boolean;
  onApprove?: (approvalId: string, messageId: string) => void;
  onDismiss?: (approvalId: string, messageId: string) => void;
}

export const HermesMessage = memo(function HermesMessage({
  message,
  isStreaming,
  onApprove,
  onDismiss,
}: HermesMessageProps) {
  const isUser = message.role === "user";
  const text = message.content;
  const pendingApprovals = (message.pendingApprovals ?? []).filter(
    (a) => !a.dismissed && !a.approved
  );

  return (
    <div className="flex w-full flex-col gap-1">
      <Message from={isUser ? "user" : "assistant"}>
        <MessageContent
          variant={isUser ? "contained" : "flat"}
          className="max-w-full min-w-0"
        >
          {text && (
            <Response className="w-auto [overflow-wrap:anywhere] whitespace-pre-wrap">
              {text}
            </Response>
          )}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-bottom" />
          )}
        </MessageContent>
        {!isUser && (
          <div className="ring-border size-6 flex-shrink-0 self-end overflow-hidden rounded-full ring-1">
            <Orb
              className="h-full w-full"
              agentState={isStreaming ? "talking" : null}
            />
          </div>
        )}
      </Message>
      {pendingApprovals.map((approval) => (
        <HermesApprovalCard
          key={approval.id}
          approval={approval}
          onApprove={() => onApprove?.(approval.id, message.id)}
          onDismiss={() => onDismiss?.(approval.id, message.id)}
        />
      ))}
    </div>
  );
});

// -- Typing indicator ----------------------------------------------------------

export function HermesTypingIndicator() {
  return (
    <div className="flex w-full flex-col gap-1">
      <Message from="assistant">
        <MessageContent variant="flat" className="max-w-full min-w-0">
          <div className="flex gap-1 py-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="bg-muted-foreground/50 h-1.5 w-1.5 animate-bounce rounded-full"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </MessageContent>
        <div className="ring-border size-6 flex-shrink-0 self-end overflow-hidden rounded-full ring-1">
          <Orb className="h-full w-full" agentState="thinking" />
        </div>
      </Message>
    </div>
  );
}
