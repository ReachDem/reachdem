"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  OnboardingStep,
  OnboardingStepLeftWrapper,
  OnboardingStepRightWrapper,
  DashboardIllustration,
} from "@/components/onboarding1";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { saveAcquisitionSource } from "@/actions/onboarding";
import { AcquisitionSource } from "@reachdem/shared";

export default function AcquisitionSetupPage() {
  const router = useRouter();
  const [source, setSource] = useState<AcquisitionSource | null>(null);
  const [otherText, setOtherText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sources: { value: AcquisitionSource; label: string }[] = [
    { value: "linkedin", label: "LinkedIn" },
    { value: "facebook", label: "Facebook / Instagram" },
    { value: "google", label: "Google Search" },
    { value: "tiktok", label: "TikTok" },
    { value: "friend_colleague", label: "Friend or colleague" },
    { value: "other", label: "Other" },
  ];

  const onSubmit = async () => {
    if (!source) {
      setError("Please select an option to continue.");
      return;
    }

    if (source === "other" && !otherText.trim()) {
      setError("Please specify how you heard about us.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await saveAcquisitionSource(
      source,
      source === "other" ? otherText : undefined
    );

    if (!result.success && "error" in result && result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push("/setup/transition");
  };

  return (
    <OnboardingStep>
      <OnboardingStepLeftWrapper
        title="Tell us more about you"
        currentStep={2} // Step index 2
        totalSteps={4}
      >
        <div className="flex h-full flex-col justify-between py-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm">How did you hear about ReachDem?</p>
              <div className="flex flex-wrap items-center gap-2">
                {sources.map((s) => (
                  <div
                    key={s.value}
                    role="button"
                    className={cn(
                      "cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      source === s.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted bg-background text-foreground"
                    )}
                    onClick={() => {
                      setSource(s.value);
                      setError(null);
                    }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>

              {source === "other" && (
                <div className="animate-in fade-in slide-in-from-top-2 mt-4 space-y-2">
                  <Label htmlFor="otherText">Please specify</Label>
                  <Input
                    id="otherText"
                    placeholder="e.g. Conference, Podcast..."
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="border-destructive/50 text-destructive bg-destructive/10 mt-4 rounded-lg border p-4 text-sm">
              <p>{error}</p>
            </div>
          )}

          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="mt-6 w-full"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </div>
      </OnboardingStepLeftWrapper>
      <OnboardingStepRightWrapper className="from-background to-muted bg-gradient-to-t">
        <DashboardIllustration title="Welcome to ReachDem" />
      </OnboardingStepRightWrapper>
    </OnboardingStep>
  );
}
