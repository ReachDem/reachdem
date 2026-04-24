"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Orb } from "@/components/ui/orb";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { cn } from "@/lib/utils";
import { useAIVoice, voiceStatusToAgentState } from "@/hooks/use-ai-voice";
import type { HermesLang } from "@/hooks/use-lang-preference";

interface HermesVoicePanelProps {
  lang?: HermesLang;
  onSwitchToText?: () => void;
  className?: string;
}

export function HermesVoicePanel({
  lang = "fr",
  onSwitchToText,
  className,
}: HermesVoicePanelProps) {
  const {
    status,
    error,
    isMuted,
    isActive,
    transcript,
    inputVolumeRef,
    outputVolumeRef,
    startSession,
    endSession,
    toggleMute,
  } = useAIVoice();

  const agentState = voiceStatusToAgentState(status);
  const lastEntry = transcript[transcript.length - 1];

  const statusLabel: Record<typeof status, string> = {
    idle: "Cliquez pour démarrer",
    connecting: "Connexion…",
    listening: "J'écoute…",
    thinking: "Hermès réfléchit…",
    speaking: "Hermès parle…",
    error: error ?? "Erreur de connexion",
  };

  return (
    <div className={cn("flex flex-col items-center gap-6 py-6", className)}>
      {/* Orb */}
      <button
        type="button"
        onClick={isActive ? undefined : () => startSession(lang)}
        disabled={status === "connecting"}
        className={cn(
          "group relative rounded-full focus-visible:outline-none",
          !isActive && "cursor-pointer transition-transform hover:scale-105"
        )}
        aria-label={
          isActive ? "Conversation en cours" : "Démarrer la conversation vocale"
        }
      >
        <div className="size-24 overflow-hidden rounded-full">
          <Orb
            className="h-full w-full"
            agentState={agentState}
            inputVolumeRef={inputVolumeRef}
            outputVolumeRef={outputVolumeRef}
          />
        </div>
      </button>

      {/* Status label */}
      <div className="space-y-1 text-center">
        {status === "speaking" && lastEntry?.role === "assistant" ? (
          <ShimmeringText
            text={lastEntry.text}
            className="block max-w-xs text-sm font-medium"
          />
        ) : (
          <p
            className={cn(
              "text-sm font-medium",
              status === "error" ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {statusLabel[status]}
          </p>
        )}
      </div>

      {/* Transcript scroll */}
      {transcript.length > 0 && (
        <div className="max-h-32 w-full space-y-1.5 overflow-y-auto px-1">
          {transcript.slice(-6).map((entry, i) => (
            <p
              key={i}
              className={cn(
                "text-xs leading-snug",
                entry.role === "user"
                  ? "text-foreground text-right"
                  : "text-muted-foreground text-left"
              )}
            >
              {entry.text}
            </p>
          ))}
        </div>
      )}

      {/* Controls */}
      {isActive && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={toggleMute}
            aria-label={isMuted ? "Activer le micro" : "Désactiver le micro"}
          >
            {isMuted ? (
              <MicOff className="text-destructive h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-destructive/50 text-destructive hover:bg-destructive/10 h-10 w-10 rounded-full"
            onClick={endSession}
            aria-label="Terminer la conversation"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      )}

      {onSwitchToText && (
        <button
          type="button"
          onClick={onSwitchToText}
          className="text-muted-foreground/60 hover:text-muted-foreground text-[11px] underline underline-offset-2 transition-colors"
        >
          Passer en mode texte
        </button>
      )}
    </div>
  );
}
