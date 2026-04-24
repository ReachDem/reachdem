"use client";

import { cn } from "@/lib/utils";
import type { VoiceStatus } from "@/hooks/use-ai-voice";

interface AIVoiceOrbProps {
  status: VoiceStatus;
  onClick: () => void;
  className?: string;
}

const statusConfig: Record<
  VoiceStatus,
  { label: string; ring: string; fill: string; pulse: boolean }
> = {
  idle: {
    label: "Start voice",
    ring: "ring-border",
    fill: "bg-muted",
    pulse: false,
  },
  connecting: {
    label: "Connecting…",
    ring: "ring-amber-400/60",
    fill: "bg-amber-400/20",
    pulse: true,
  },
  listening: {
    label: "Listening…",
    ring: "ring-primary/70",
    fill: "bg-primary/15",
    pulse: true,
  },
  thinking: {
    label: "Thinking…",
    ring: "ring-violet-400/70",
    fill: "bg-violet-400/15",
    pulse: true,
  },
  speaking: {
    label: "Speaking…",
    ring: "ring-emerald-400/70",
    fill: "bg-emerald-400/15",
    pulse: true,
  },
  error: {
    label: "Error — retry",
    ring: "ring-destructive/60",
    fill: "bg-destructive/10",
    pulse: false,
  },
};

export function AIVoiceOrb({ status, onClick, className }: AIVoiceOrbProps) {
  const cfg = statusConfig[status];

  return (
    <button
      type="button"
      aria-label={cfg.label}
      onClick={onClick}
      className={cn(
        "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full ring-2 transition-all duration-300 focus-visible:ring-offset-2 focus-visible:outline-none",
        cfg.ring,
        cfg.fill,
        cfg.pulse && "animate-pulse",
        className
      )}
    >
      {/* inner glow dot */}
      <span
        className={cn(
          "h-5 w-5 rounded-full transition-all duration-300",
          status === "idle" && "bg-muted-foreground/40",
          status === "connecting" && "bg-amber-400",
          status === "listening" && "bg-primary",
          status === "thinking" && "bg-violet-400",
          status === "speaking" && "bg-emerald-400",
          status === "error" && "bg-destructive"
        )}
      />
      {/* sound-wave rings when speaking / listening */}
      {(status === "speaking" || status === "listening") && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full opacity-30 ring-1 ring-current" />
          <span
            className="absolute inset-[-8px] animate-ping rounded-full opacity-15 ring-1 ring-current"
            style={{ animationDelay: "150ms" }}
          />
        </>
      )}
    </button>
  );
}
