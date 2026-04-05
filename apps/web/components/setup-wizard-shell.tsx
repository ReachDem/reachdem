"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSound } from "@/hooks/use-sound";
import { round1Sound } from "@/lib/round-1";
import { round2Sound } from "@/lib/round-2";
import { voiceoverPackFighterFinalRoundSound } from "@/lib/voiceover-pack-fighter-final-round";
import { voiceoverPackFemaleReadySound } from "@/lib/voiceover-pack-female-ready";

export function SetupWizardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevStepRef = useRef<number>(-1);

  const [playRound1] = useSound(round1Sound);
  const [playRound2] = useSound(round2Sound);
  const [playFinalRound] = useSound(voiceoverPackFighterFinalRoundSound);
  const [playReady] = useSound(voiceoverPackFemaleReadySound);

  const stepMapping: Record<string, number> = {
    "/setup/workspace": 0,
    "/setup/profile": 1,
    "/setup/acquisition": 2,
    "/setup/transition": 3,
  };

  const currentStep = stepMapping[pathname] ?? -1;

  useEffect(() => {
    if (currentStep !== -1 && currentStep > prevStepRef.current) {
      if (currentStep === 0) playRound1();
      else if (currentStep === 1) playRound2();
      else if (currentStep === 2) playFinalRound();
      else if (currentStep === 3) playReady();
      prevStepRef.current = currentStep;
    }
  }, [currentStep, playRound1, playRound2, playFinalRound, playReady]);

  return (
    <div className="flex min-h-svh items-center justify-center py-10">
      <div className="w-full max-w-5xl px-4">{children}</div>
    </div>
  );
}
