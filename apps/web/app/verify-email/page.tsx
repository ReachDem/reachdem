"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  OnboardingStep,
  OnboardingStepLeftWrapper,
  OnboardingStepRightWrapper,
  DashboardIllustration,
} from "@/components/onboarding1";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { authClient } from "@reachdem/auth/client";
import { verifyOtpCompletion, sendVerificationOtp } from "@/actions/onboarding";
import { useSession } from "@reachdem/auth/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { data: sessionData, isPending } = useSession();

  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (sessionData?.user?.emailVerified) {
      router.push("/continue-setup");
    }
  }, [sessionData, router]);

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!sessionData?.user) {
    router.push("/login");
    return null;
  }

  const email = sessionData.user.email;
  // Mask email: j***@example.com
  const [namePart, domainPart] = email.split("@");
  const maskedEmail =
    namePart.length > 2
      ? `${namePart.substring(0, 1)}${"*".repeat(namePart.length - 2)}${namePart.substring(namePart.length - 1)}@${domainPart}`
      : `${namePart.substring(0, 1)}***@${domainPart}`;

  const handleVerifyOtp = async (otp: string) => {
    setOtpLoading(true);
    setOtpError(null);

    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });

      if (verifyError) {
        setOtpError("Invalid or expired code");
        setOtpLoading(false);
        return;
      }

      // Transition onboarding state
      const result = await verifyOtpCompletion();
      if (result?.error) {
        setOtpError(result.error);
        setOtpLoading(false);
        return;
      }

      // Success
      window.location.href = "/setup/workspace";
    } catch (err) {
      setOtpError("An unexpected error occurred.");
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setOtpError(null);
    const result = await sendVerificationOtp(email);

    if (!result.success && "error" in result && result.error) {
      setOtpError(result.error);
    } else {
      setResendCooldown(60);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center py-10">
      <div className="w-full max-w-5xl px-4">
        <OnboardingStep>
          <OnboardingStepLeftWrapper
            title="Verify your email"
            currentStep={0} // Doesn't really apply to setup but we can put 0
            totalSteps={1}
          >
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 py-4">
              <div className="space-y-3">
                <p className="text-sm leading-6">
                  To secure your account, we sent a verification code to:
                  <br />
                  <span className="font-semibold">{maskedEmail}</span>
                </p>
                <p className="text-muted-foreground text-sm leading-6">
                  Please enter the 6-digit code below. The code expires in 15
                  minutes.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center space-y-6 py-4">
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={otpValue}
                  onChange={(value) => {
                    setOtpValue(value);
                    if (value.length === 6) {
                      void handleVerifyOtp(value);
                    }
                  }}
                  disabled={otpLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                {otpLoading && (
                  <p className="text-muted-foreground animate-pulse text-sm">
                    Verifying...
                  </p>
                )}

                {otpError && (
                  <div className="bg-destructive/10 text-destructive w-full rounded-md p-3 text-center text-sm">
                    {otpError}
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-3">
                <Button
                  variant="outline"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || otpLoading}
                  className="w-full"
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend code via email"}
                </Button>

                {/* Note: Change email functionality can be implemented here via a modal linking to changePendingEmail action */}
                <div className="mt-4 text-center">
                  <p className="text-muted-foreground text-xs">
                    Wrong email address? <br />
                    <a
                      href="/login"
                      className="hover:text-foreground underline transition-colors"
                    >
                      Sign out and restart
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </OnboardingStepLeftWrapper>

          <OnboardingStepRightWrapper className="from-background to-muted bg-gradient-to-br">
            <DashboardIllustration title="Security Verification" />
          </OnboardingStepRightWrapper>
        </OnboardingStep>
      </div>
    </div>
  );
}
