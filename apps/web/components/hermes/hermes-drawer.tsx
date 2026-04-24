"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { AudioLinesIcon, PhoneOffIcon, SendIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useHermesChat } from "@/hooks/use-hermes-chat";
import { useLangPreference } from "@/hooks/use-lang-preference";
import type { HermesLang } from "@/hooks/use-lang-preference";
import { useAIVoice, voiceStatusToAgentState } from "@/hooks/use-ai-voice";
import { Orb } from "@/components/ui/orb";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ui/conversation";
import { Message, MessageContent } from "@/components/ui/message";
import { Response } from "@/components/ui/response";
import { HermesMessage, HermesTypingIndicator } from "./hermes-message";
import type { AIPageContext } from "@/lib/ai/types";

interface HermesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: AIPageContext;
}

export function HermesDrawer({ open, onOpenChange, page }: HermesDrawerProps) {
  const [localInput, setLocalInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang } = useLangPreference();
  const activeLang: HermesLang = lang ?? "fr";

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    dismissApproval,
    markApproved,
  } = useHermesChat({ page });

  const {
    status: voiceStatus,
    error: voiceError,
    isActive: isVoiceActive,
    transcript,
    inputVolumeRef,
    outputVolumeRef,
    startSession,
    endSession,
  } = useAIVoice();

  const voiceAgentState = voiceStatusToAgentState(voiceStatus);
  const isTransitioning = voiceStatus === "connecting";
  const isCallActive =
    voiceStatus === "listening" ||
    voiceStatus === "speaking" ||
    voiceStatus === "thinking";

  // Orb state: voice takes priority, then text loading
  const headerOrbState = voiceAgentState ?? (isLoading ? "thinking" : null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSend = useCallback(() => {
    const text = localInput.trim();
    if (!text || isLoading) return;
    setLocalInput("");
    sendMessage(text);
  }, [localInput, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = useCallback(async () => {
    if (isCallActive || isTransitioning) {
      endSession();
    } else {
      await startSession(activeLang);
    }
  }, [isCallActive, isTransitioning, endSession, startSession, activeLang]);

  const handleApprove = useCallback(
    async (approvalId: string, messageId: string) => {
      markApproved(messageId, approvalId);
    },
    [markApproved]
  );

  const handleDismiss = useCallback(
    (approvalId: string, messageId: string) => {
      dismissApproval(messageId, approvalId);
    },
    [dismissApproval]
  );

  const showVoice = isVoiceActive || transcript.length > 0;
  const isEmpty = showVoice ? transcript.length === 0 : messages.length === 0;
  const hasContent = messages.length > 0 || transcript.length > 0;

  const statusText = voiceError
    ? null
    : voiceStatus === "connecting"
      ? "Connexion…"
      : voiceStatus === "listening"
        ? "J'écoute…"
        : voiceStatus === "speaking"
          ? "Hermès parle…"
          : voiceStatus === "thinking"
            ? "Réflexion…"
            : isLoading
              ? "Hermès réfléchit…"
              : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full w-[420px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[420px]"
      >
        <SheetTitle className="sr-only">Hermès — Assistant IA</SheetTitle>

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Small Orb */}
            <div className="ring-border relative size-10 overflow-hidden rounded-full ring-1">
              <Orb
                className="h-full w-full"
                agentState={headerOrbState}
                inputVolumeRef={inputVolumeRef}
                outputVolumeRef={outputVolumeRef}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm leading-none font-medium">Hermès</p>
              <div className="flex items-center gap-1.5">
                {voiceError ? (
                  <p className="text-destructive text-xs">{voiceError}</p>
                ) : isCallActive ? (
                  <p className="text-xs text-green-600">Connecté</p>
                ) : statusText ? (
                  <ShimmeringText text={statusText} className="text-xs" />
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Votre assistant IA
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status dot */}
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-300",
                isCallActive &&
                  "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]",
                isTransitioning && "bg-muted-foreground/40 animate-pulse"
              )}
            />
            {/* Clear */}
            {hasContent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearMessages}
                aria-label="Effacer la conversation"
              >
                <Trash2 className="text-muted-foreground h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Messages ── */}
        <Conversation className="flex-1">
          <ConversationContent className="flex min-w-0 flex-col gap-2 p-4 pb-2">
            {isEmpty ? (
              <ConversationEmptyState
                icon={
                  <div className="size-16 overflow-hidden rounded-full">
                    <Orb
                      className="h-full w-full"
                      agentState={headerOrbState}
                    />
                  </div>
                }
                title={
                  isTransitioning ? (
                    <ShimmeringText text="Démarrage de la conversation" />
                  ) : isCallActive ? (
                    <ShimmeringText text="Parlez ou tapez un message" />
                  ) : (
                    "Démarrez une conversation"
                  )
                }
                description={
                  isTransitioning
                    ? "Connexion en cours…"
                    : isCallActive
                      ? "Prêt à discuter"
                      : "Tapez un message ou appuyez sur le bouton voix"
                }
              />
            ) : showVoice ? (
              // Voice transcript
              transcript.map((entry, i) => (
                <div key={i} className="flex w-full flex-col gap-1">
                  <Message from={entry.role === "user" ? "user" : "assistant"}>
                    <MessageContent
                      variant="flat"
                      className="max-w-full min-w-0"
                    >
                      <Response className="w-auto [overflow-wrap:anywhere] whitespace-pre-wrap">
                        {entry.text}
                      </Response>
                    </MessageContent>
                    {entry.role === "assistant" && (
                      <div className="ring-border size-6 flex-shrink-0 self-end overflow-hidden rounded-full ring-1">
                        <Orb
                          className="h-full w-full"
                          agentState={
                            isCallActive && i === transcript.length - 1
                              ? "talking"
                              : null
                          }
                        />
                      </div>
                    )}
                  </Message>
                </div>
              ))
            ) : (
              // Text chat
              <>
                {messages.map((msg, i) => {
                  const isLast = i === messages.length - 1;
                  const isStreamingThis =
                    isLast && isLoading && msg.role === "assistant";
                  return (
                    <HermesMessage
                      key={msg.id}
                      message={msg}
                      isStreaming={isStreamingThis}
                      onApprove={handleApprove}
                      onDismiss={handleDismiss}
                    />
                  );
                })}
                {isLoading &&
                  messages[messages.length - 1]?.role !== "assistant" && (
                    <HermesTypingIndicator />
                  )}
              </>
            )}

            {error && (
              <p className="text-destructive py-2 text-center text-xs">
                {error.message ?? "Une erreur est survenue."}
              </p>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t p-3">
          <div className="flex w-full items-center gap-2">
            <Input
              ref={inputRef}
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Hermès…"
              className="h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isTransitioning || isVoiceActive}
            />
            <Button
              onClick={handleSend}
              size="icon"
              variant="ghost"
              className="rounded-full"
              disabled={!localInput.trim() || isLoading || isVoiceActive}
            >
              <SendIcon className="size-4" />
              <span className="sr-only">Envoyer</span>
            </Button>
            {!isCallActive ? (
              <Button
                onClick={handleVoiceToggle}
                size="icon"
                variant="ghost"
                className="relative shrink-0 rounded-full transition-all"
                disabled={isTransitioning}
              >
                <AudioLinesIcon className="size-4" />
                <span className="sr-only">Démarrer la voix</span>
              </Button>
            ) : (
              <Button
                onClick={handleVoiceToggle}
                size="icon"
                variant="secondary"
                className="relative shrink-0 rounded-full transition-all"
              >
                <PhoneOffIcon className="size-4" />
                <span className="sr-only">Terminer l'appel</span>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
