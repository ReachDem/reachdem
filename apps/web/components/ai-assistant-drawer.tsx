"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Mic, MicOff, PhoneOff, SendHorizonal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AIMessage, AITypingIndicator } from "@/components/ai-message";
import { AIVoiceOrb } from "@/components/ai-voice-orb";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useAIVoice } from "@/hooks/use-ai-voice";
import {
  useLangPreference,
  type HermesLang,
} from "@/hooks/use-lang-preference";
import type { AIPageContext, PendingApproval } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

interface AIAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: AIPageContext;
}

type DrawerCopy = {
  title: string;
  placeholder: string;
  clear: string;
  emptyTitle: string;
  emptyDesc: string;
  suggestions: string[];
  voiceListening: string;
  voiceThinking: string;
  voiceSpeaking: string;
  voiceConnecting: string;
  voiceEnd: string;
  voiceStart: string;
  mute: string;
  unmute: string;
};

const i18n = {
  en: {
    title: "Hermes",
    placeholder: "Message Hermes…",
    clear: "Clear conversation",
    emptyTitle: "How can I help?",
    emptyDesc:
      "Ask Hermes anything about your contacts, campaigns, or messages.",
    suggestions: [
      "Summarize this contact",
      "Draft a follow-up",
      "Show recent campaigns",
    ],
    voiceListening: "Listening…",
    voiceThinking: "Thinking…",
    voiceSpeaking: "Speaking…",
    voiceConnecting: "Connecting…",
    voiceEnd: "End voice",
    voiceStart: "Start voice",
    mute: "Mute",
    unmute: "Unmute",
  },
  fr: {
    title: "Hermès",
    placeholder: "Message Hermès…",
    clear: "Effacer la conversation",
    emptyTitle: "Comment puis-je vous aider ?",
    emptyDesc:
      "Posez une question à Hermès sur vos contacts, campagnes ou messages.",
    suggestions: [
      "Résumer ce contact",
      "Rédiger un suivi",
      "Voir les campagnes récentes",
    ],
    voiceListening: "En écoute…",
    voiceThinking: "Réflexion…",
    voiceSpeaking: "En train de parler…",
    voiceConnecting: "Connexion…",
    voiceEnd: "Terminer la voix",
    voiceStart: "Démarrer la voix",
    mute: "Couper le micro",
    unmute: "Rétablir le micro",
  },
} satisfies Record<HermesLang, DrawerCopy>;

function HermesLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-primary", className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" className="fill-primary/10" />
      <path
        d="M8 8h8M9 12h6M10 16h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 6.5c0-.83.67-1.5 2-1.5s2 .67 2 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AIAssistantDrawer({
  open,
  onOpenChange,
  page,
}: AIAssistantDrawerProps) {
  const [input, setInput] = useState("");
  const [dismissedApprovals, setDismissedApprovals] = useState<Set<string>>(
    new Set()
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { lang, setLang, hasPref } = useLangPreference();
  const activeLang: HermesLang = lang ?? "en";
  const t = i18n[activeLang];

  const {
    messages,
    isLoading,
    thinkingStep,
    error,
    sendMessage,
    approveAction,
    clearMessages,
  } = useAIChat({ page });

  const voice = useAIVoice();

  /* auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* focus textarea when drawer opens */
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage(text);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDismissApproval = useCallback((id: string) => {
    setDismissedApprovals((prev) => new Set(prev).add(id));
  }, []);

  const handleApprove = useCallback(
    async (approval: PendingApproval) => {
      setDismissedApprovals((prev) => new Set(prev).add(approval.id));
      await approveAction(approval);
    },
    [approveAction]
  );

  const toggleVoice = useCallback(async () => {
    if (voice.isActive) {
      await voice.endSession();
    } else {
      await voice.startSession(activeLang);
    }
  }, [voice, activeLang]);

  const isEmpty = messages.length === 0;
  const voiceActive = voice.isActive;
  // Show language picker when the drawer opens for the first time (no saved preference)
  const showLangPicker = !hasPref && isEmpty && !voiceActive;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full w-[400px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[400px]"
      >
        {/* ── Header ── */}
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <HermesLogo className="h-6 w-6" />
            <SheetTitle className="text-sm font-semibold">{t.title}</SheetTitle>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={clearMessages}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t.clear}</TooltipContent>
              </Tooltip>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SheetHeader>

        <Separator />

        {/* ── Voice mode banner ── */}
        {voiceActive && (
          <div className="bg-muted/40 flex shrink-0 flex-col items-center gap-3 py-6">
            <AIVoiceOrb status={voice.status} onClick={toggleVoice} />
            <p className="text-muted-foreground text-xs capitalize">
              {voice.status === "listening" && t.voiceListening}
              {voice.status === "thinking" && t.voiceThinking}
              {voice.status === "speaking" && t.voiceSpeaking}
              {voice.status === "connecting" && t.voiceConnecting}
              {voice.status === "error" && (voice.error ?? "Voice error")}
            </p>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-full"
                    onClick={voice.toggleMute}
                  >
                    {voice.isMuted ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {voice.isMuted ? t.unmute : t.mute}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 rounded-full"
                    onClick={voice.endSession}
                  >
                    <PhoneOff className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>End voice session</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 py-4 pr-5 pl-4">
            {/* Language picker — shown only on first open */}
            {showLangPicker && (
              <div className="flex flex-col items-center gap-5 pt-10 text-center">
                <HermesLogo className="h-14 w-14" />
                <div className="space-y-1">
                  <p className="text-base font-semibold">Hermes · Hermès</p>
                  <p className="text-muted-foreground max-w-[240px] text-xs">
                    Choose your preferred language.
                    <br />
                    Choisissez votre langue préférée.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className="bg-muted hover:border-primary hover:bg-primary/5 focus-visible:ring-primary flex flex-col items-center gap-1.5 rounded-xl border-2 border-transparent px-5 py-3 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="text-2xl">🇬🇧</span>
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("fr")}
                    className="bg-muted hover:border-primary hover:bg-primary/5 focus-visible:ring-primary flex flex-col items-center gap-1.5 rounded-xl border-2 border-transparent px-5 py-3 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="text-2xl">🇫🇷</span>
                    Français
                  </button>
                </div>
              </div>
            )}

            {isEmpty && !voiceActive && hasPref && (
              <div className="flex flex-col items-center gap-3 pt-12 text-center">
                <HermesLogo className="h-12 w-12" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t.emptyTitle}</p>
                  <p className="text-muted-foreground max-w-[220px] text-xs">
                    {t.emptyDesc}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {t.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full border px-3 py-1 text-xs transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {/* small lang-switch link */}
                <button
                  type="button"
                  onClick={() => setLang(activeLang === "en" ? "fr" : "en")}
                  className="text-muted-foreground mt-1 text-[10px] underline-offset-2 hover:underline"
                >
                  {activeLang === "en"
                    ? "Passer en français"
                    : "Switch to English"}
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <AIMessage
                key={msg.id}
                onSendMessage={sendMessage}
                message={{
                  ...msg,
                  pendingApprovals: msg.pendingApprovals?.filter(
                    (ap) => !dismissedApprovals.has(ap.id)
                  ),
                }}
                onApprove={handleApprove}
                onDismissApproval={handleDismissApproval}
                isLoading={isLoading}
              />
            ))}

            {isLoading && <AITypingIndicator label={thinkingStep} />}

            {error && (
              <p className="text-destructive px-2 text-center text-xs">
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* ── Input bar ── */}
        <div className="flex shrink-0 items-end gap-2 px-3 py-3">
          {/* voice toggle button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant={voiceActive ? "default" : "outline"}
                className={cn(
                  "h-9 w-9 shrink-0 rounded-full transition-all",
                  voiceActive && "bg-primary text-primary-foreground"
                )}
                onClick={toggleVoice}
                disabled={voice.status === "connecting"}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {voiceActive ? t.voiceEnd : t.voiceStart}
            </TooltipContent>
          </Tooltip>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            rows={1}
            className="scrollbar-thin max-h-36 min-h-9 flex-1 resize-none rounded-2xl py-2 text-sm leading-relaxed"
            disabled={isLoading}
          />

          <Button
            type="button"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
