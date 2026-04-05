"use client";

import { useEffect, useState } from "react";
import {
  OnboardingStep,
  OnboardingStepLeftWrapper,
  OnboardingStepRightWrapper,
  DashboardIllustration,
} from "@/components/onboarding1";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/actions/onboarding";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export default function TransitionSetupPage() {
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Mark onboarding as complete in the DB
    const markComplete = async () => {
      const result = await completeOnboarding();
      if (result.error) {
        setError(result.error);
        console.error("Failed to complete onboarding:", result.error);
      }
    };
    markComplete();

    // 2. Start countdown for auto-redirect (decrement only — navigation is in a separate effect)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 3. Navigate when countdown hits 0
  useEffect(() => {
    if (countdown === 0) {
      window.location.href = "/dashboard";
    }
  }, [countdown]);

  return (
    <OnboardingStep>
      <OnboardingStepLeftWrapper
        title="Setup Complete!"
        currentStep={3} // Step index 3
        totalSteps={4}
      >
        <div className="animate-in fade-in slide-in-from-bottom-4 flex h-full flex-col justify-center py-10 text-center duration-500">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="bg-primary/10 text-primary mx-auto mb-6 flex size-20 items-center justify-center rounded-full"
          >
            <CheckCircle2 className="size-10" />
          </motion.div>

          <h2 className="mb-2 text-2xl font-semibold tracking-tight">
            You're all set!
          </h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-sm text-sm">
            Your account is now configured. Redirecting to your dashboard in{" "}
            {countdown} seconds...
          </p>

          {error && (
            <p className="text-destructive bg-destructive/10 mb-4 rounded p-2 text-sm">
              {error}
            </p>
          )}

          <Button
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="mx-auto w-full sm:w-auto"
            size="lg"
          >
            {countdown > 0 ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Go to Dashboard
          </Button>
        </div>
      </OnboardingStepLeftWrapper>
      <OnboardingStepRightWrapper className="from-background to-muted bg-gradient-to-t">
        <DashboardIllustration variant="zoomed-in" title="Welcome!" />
      </OnboardingStepRightWrapper>
    </OnboardingStep>
  );
}
