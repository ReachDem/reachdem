"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { markChecklistStepSeen } from "@/actions/dashboard-onboarding";

export function getTipContent(stepId: string) {
  switch (stepId) {
    case "step1":
      return {
        title: "Pro Tip: Sender IDs",
        description:
          "Your sender ID is the name that appears on your customers' phones. A recognizable name can improve open rates by 30%.",
      };
    case "step2":
      return {
        title: "Pro Tip: Data Import",
        description:
          "Make sure all your phone numbers include the international country code format (example: +33...) for better deliverability.",
      };
    case "step3":
      return {
        title: "Pro Tip: First Campaign",
        description:
          "Testing first is key! Send a quick test message to yourself before broadcasting to your entire list.",
      };
    default:
      return {
        title: "Did you know?",
        description:
          "Completing this checklist fully unlocks your dashboard's capabilities.",
      };
  }
}

interface TipsContextType {
  activeTip: string | null;
  showTip: (tipId: string) => void;
  dismissTip: () => void;
  isTipDismissed: (tipId: string) => boolean;
}

const TipsContext = createContext<TipsContextType | undefined>(undefined);

export function TipsProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: Record<string, any>;
}) {
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [dismissedTips, setDismissedTips] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    // We could hydrate ignored tips from `initialState` here.
    if (initialState?.dismissedTips) {
      setDismissedTips(initialState.dismissedTips);
    }
  }, [initialState]);

  const showTip = (tipId: string) => {
    if (!dismissedTips[tipId]) {
      setActiveTip(tipId);
    }
  };

  const dismissTip = async () => {
    if (activeTip) {
      setDismissedTips((prev) => ({ ...prev, [activeTip]: true }));
      const tipId = activeTip;
      setActiveTip(null);
      await markChecklistStepSeen(tipId);
    }
  };

  const isTipDismissed = (tipId: string) => {
    return Boolean(dismissedTips[tipId]);
  };

  return (
    <TipsContext.Provider
      value={{ activeTip, showTip, dismissTip, isTipDismissed }}
    >
      {children}
    </TipsContext.Provider>
  );
}

export const useTipsEngine = () => {
  const context = useContext(TipsContext);
  if (context === undefined) {
    throw new Error("useTipsEngine must be used within a TipsProvider");
  }
  return context;
};
