"use client";

import { useState, useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import type { HermesLang } from "@/hooks/use-lang-preference";

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

/** Map VoiceStatus to Orb AgentState (null | "thinking" | "listening" | "talking") */
export function voiceStatusToAgentState(
  status: VoiceStatus
): null | "thinking" | "listening" | "talking" {
  switch (status) {
    case "connecting":
      return "thinking";
    case "listening":
      return "listening";
    case "thinking":
      return "thinking";
    case "speaking":
      return "talking";
    default:
      return null;
  }
}

const FIRST_MESSAGE: Record<HermesLang, string> = {
  en: "Hi, I'm Hermes, your ReachDem assistant. How can I help you today?",
  fr: "Bonjour, je suis Hermès, votre assistant ReachDem. Comment puis-je vous aider ?",
};

export function useAIVoice() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const signedUrlRef = useRef<string | null>(null);
  const inputVolumeRef = useRef<number>(0);
  const outputVolumeRef = useRef<number>(0);

  const conversation = useConversation({
    onConnect: () => setStatus("listening"),
    onDisconnect: () => {
      setStatus("idle");
      inputVolumeRef.current = 0;
      outputVolumeRef.current = 0;
    },
    onMessage: ({ message, source }) => {
      if (source === "ai") {
        setStatus("speaking");
        setTranscript((prev) => [
          ...prev,
          { role: "assistant", text: message },
        ]);
      }
      if (source === "user") {
        setStatus("thinking");
        setTranscript((prev) => [...prev, { role: "user", text: message }]);
      }
    },
    onError: (err) => {
      setError(typeof err === "string" ? err : "Voice error occurred");
      setStatus("error");
    },
  });

  const getInputVolume = useCallback(() => inputVolumeRef.current, []);
  const getOutputVolume = useCallback(() => outputVolumeRef.current, []);

  const startSession = useCallback(
    async (lang: HermesLang = "en") => {
      setError(null);
      setTranscript([]);
      setStatus("connecting");
      try {
        const res = await fetch("/api/ai/voice/session", { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to create voice session");
        }
        const { signedUrl, userFirstName } = await res.json();
        signedUrlRef.current = signedUrl;
        await conversation.startSession({
          signedUrl,
          overrides: {
            agent: {
              firstMessage: FIRST_MESSAGE[lang],
              language: lang,
            },
          },
          dynamicVariables: {
            user_first_name: userFirstName ?? "",
            lang,
          },
        });
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Could not start voice session"
        );
        setStatus("error");
      }
    },
    [conversation]
  );

  const endSession = useCallback(async () => {
    await conversation.endSession();
    setStatus("idle");
    setError(null);
    inputVolumeRef.current = 0;
    outputVolumeRef.current = 0;
  }, [conversation]);

  const toggleMute = useCallback(async () => {
    const next = !isMuted;
    await conversation.setVolume({ volume: next ? 0 : 1 });
    setIsMuted(next);
  }, [conversation, isMuted]);

  const isActive = status !== "idle" && status !== "error";

  return {
    status,
    error,
    isMuted,
    isActive,
    transcript,
    inputVolumeRef,
    outputVolumeRef,
    getInputVolume,
    getOutputVolume,
    startSession,
    endSession,
    toggleMute,
  };
}
