"use client";

import { useTipsEngine } from "@/components/onboarding/tips-engine";
import { useEffect } from "react";

export function useOnboardingTip(tipId: string, conditionToShow = true) {
  const { showTip, isTipDismissed } = useTipsEngine();

  useEffect(() => {
    if (conditionToShow && !isTipDismissed(tipId)) {
      // Optional slight delay so it doesn't pop instantly jumping the UI
      const timer = setTimeout(() => {
        showTip(tipId);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tipId, conditionToShow, showTip, isTipDismissed]);
}
