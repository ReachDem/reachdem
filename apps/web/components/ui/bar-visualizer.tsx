"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { AgentState } from "./orb";

interface BarVisualizerProps extends HTMLAttributes<HTMLDivElement> {
  agentState?: AgentState;
  /** 0–1 volume that drives bar heights */
  volume?: number;
  barCount?: number;
  barWidth?: number;
  gap?: number;
  height?: number;
}

/**
 * Animated bar equalizer that reflects audio volume and agent state.
 */
export function BarVisualizer({
  agentState,
  volume = 0,
  barCount = 5,
  barWidth = 4,
  gap = 3,
  height = 32,
  className,
  ...props
}: BarVisualizerProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  const isActive =
    agentState === "listening" ||
    agentState === "talking" ||
    agentState === "thinking";

  useEffect(() => {
    let raf: number;
    let frame = 0;

    function animate() {
      frame++;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const phase = (frame * 0.08 + i * 0.7) % (Math.PI * 2);
        const wave = (Math.sin(phase) + 1) / 2; // 0–1

        let h: number;
        if (!isActive) {
          h = 4;
        } else if (agentState === "talking") {
          h = 6 + wave * (height * 0.8) + volume * height * 0.6;
        } else if (agentState === "listening") {
          h = 6 + wave * (height * 0.4) + volume * height * 0.4;
        } else {
          // thinking
          h = 4 + wave * (height * 0.3);
        }

        bar.style.height = `${Math.min(h, height)}px`;
      });
      raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [agentState, volume, isActive, height]);

  const stateColor: Record<NonNullable<AgentState>, string> = {
    listening: "bg-emerald-400",
    talking: "bg-violet-500",
    thinking: "bg-amber-400",
  };

  const barColor = agentState
    ? stateColor[agentState]
    : "bg-muted-foreground/30";

  return (
    <div
      className={cn("flex items-end", className)}
      style={{
        height,
        gap,
        width: barCount * barWidth + (barCount - 1) * gap,
      }}
      {...props}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className={cn(
            "rounded-full transition-colors duration-300",
            barColor
          )}
          style={{
            width: barWidth,
            height: 4,
            willChange: "height",
          }}
        />
      ))}
    </div>
  );
}
