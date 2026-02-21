"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { useSound } from "@/hooks/use-sound";
import { round1Sound } from "@/lib/round-1";
import { round2Sound } from "@/lib/round-2";
import { voiceoverPackFighterFinalRoundSound } from "@/lib/voiceover-pack-fighter-final-round";
import { voiceoverPackFemaleReadySound } from "@/lib/voiceover-pack-female-ready";

import { bootstrapWorkspace } from "@/actions/onboarding";
import { signUp, authClient } from "@reachdem/auth/client";
import {
  OnboardingStep,
  OnboardingStepLeftWrapper,
  OnboardingStepRightWrapper,
  DashboardIllustration,
} from "@/components/onboarding1";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  workspaceName: z
    .string()
    .min(2, "Workspace name must be at least 2 characters."),
  role: z.string().min(1, "Please select your role."),
});

type FormValues = z.infer<typeof formSchema>;

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Count down the resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const prevStepRef = useRef<number>(-1);
  const [playRound1] = useSound(round1Sound);
  const [playRound2] = useSound(round2Sound);
  const [playFinalRound] = useSound(voiceoverPackFighterFinalRoundSound);
  const [playReady] = useSound(voiceoverPackFemaleReadySound);

  useEffect(() => {
    if (currentStep > prevStepRef.current) {
      if (currentStep === 0) playRound1();
      else if (currentStep === 1) playRound2();
      else if (currentStep === 2) playFinalRound();
      else if (currentStep === 3) playReady();
    }
    prevStepRef.current = currentStep;
  }, [currentStep, playRound1, playRound2, playFinalRound, playReady]);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      workspaceName: "",
      role: "",
    },
  });

  const watchRole = watch("role");
  const watchWorkspace = watch("workspaceName");

  const steps = [
    { title: "Set up your profile", fields: ["name", "email", "password"] },
    { title: "Set up your workspace", fields: ["workspaceName"] },
    { title: "Tell us more about you", fields: ["role"] },
    { title: "Review and start", fields: [] },
  ];

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].fields as (keyof FormValues)[];
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setError(null);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // 1. Sign up user on the client to automatically manage session cookies
      const { error: signUpError } = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to sign up.");
        setIsSubmitting(false);
        return;
      }

      // Step 2: Send OTP and open modal
      const { error: otpSendError } =
        await authClient.emailOtp.sendVerificationOtp({
          email: data.email,
          type: "email-verification",
        });

      if (otpSendError) {
        setError(otpSendError.message || "Failed to send verification code.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setResendCooldown(15);
      setIsOtpModalOpen(true);
    } catch (err: Error | unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setOtpLoading(true);
    setOtpError(null);

    try {
      // 1. Verify OTP with Better Auth
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email: watch("email"),
        otp: otp,
      });

      if (verifyError) {
        setOtpError(
          verifyError.message || "Invalid or expired verification code.",
        );
        setOtpLoading(false);
        return;
      }

      // 2. Bootstrap workspace securely via server action now that session is verified
      const result = await bootstrapWorkspace({
        workspaceName: watch("workspaceName"),
        role: watch("role"),
      });

      if (result?.error) {
        setOtpError(result.error);
        setOtpLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: Error | unknown) {
      setOtpError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError(null);
    setOtpValue("");
    const { error: resendError } =
      await authClient.emailOtp.sendVerificationOtp({
        email: watch("email"),
        type: "email-verification",
      });
    if (resendError) {
      setOtpError(resendError.message || "Failed to resend code.");
    } else {
      setResendCooldown(15);
    }
  };

  const roles = [
    "Software Engineer",
    "Product Manager",
    "Designer",
    "Founder",
    "Sales",
    "Marketing",
    "Other",
  ];

  const getTabsForRole = (role: string) => {
    switch (role) {
      case "Software Engineer":
        return [
          "Repositories",
          "Code Review",
          "Deployments",
          "Issues",
          "Settings",
        ];
      case "Product Manager":
        return [
          "Roadmap",
          "Sprint Planning",
          "Backlog",
          "User Feedback",
          "Settings",
        ];
      case "Designer":
        return [
          "Design System",
          "Prototypes",
          "Assets",
          "User Testing",
          "Settings",
        ];
      case "Founder":
        return [
          "Analytics",
          "Team Directory",
          "Billing",
          "Reports",
          "Settings",
        ];
      case "Sales":
        return ["CRM", "Leads", "Pipeline", "Contracts", "Settings"];
      case "Marketing":
        return [
          "Campaigns",
          "Analytics",
          "Social Media",
          "Content",
          "Settings",
        ];
      default:
        return ["Dashboard", "Projects", "Tasks", "Activity", "Settings"];
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center py-10">
      <div className="w-full max-w-5xl px-4">
        {/* Step 1: Profile */}
        {currentStep === 0 && (
          <OnboardingStep>
            <OnboardingStepLeftWrapper
              title={steps[0].title}
              currentStep={0}
              totalSteps={4}
            >
              <form className="space-y-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleNext}
                  className="mt-4 w-full"
                >
                  Continue
                </Button>
              </form>
            </OnboardingStepLeftWrapper>
            <OnboardingStepRightWrapper>
              <DashboardIllustration
                userProfile={{
                  name: watch("name"),
                  email: watch("email"),
                }}
              />
            </OnboardingStepRightWrapper>
          </OnboardingStep>
        )}

        {/* Step 2: Workspace */}
        {currentStep === 1 && (
          <OnboardingStep>
            <OnboardingStepLeftWrapper
              title={steps[1].title}
              currentStep={1}
              totalSteps={4}
              goBack={handleBack}
            >
              <form className="space-y-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workspaceName">Workspace Name</Label>
                    <Input
                      id="workspaceName"
                      placeholder="Acme Inc."
                      {...register("workspaceName")}
                    />
                    {errors.workspaceName && (
                      <p className="text-sm text-destructive">
                        {errors.workspaceName.message}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleNext}
                  className="mt-4 w-full"
                >
                  Continue
                </Button>
              </form>
            </OnboardingStepLeftWrapper>
            <OnboardingStepRightWrapper className="bg-gradient-to-b from-background to-muted">
              <DashboardIllustration
                variant="zoomed-in"
                title={watchWorkspace || "Your Workspace"}
              />
            </OnboardingStepRightWrapper>
          </OnboardingStep>
        )}

        {/* Step 3: Role */}
        {currentStep === 2 && (
          <OnboardingStep>
            <OnboardingStepLeftWrapper
              title={steps[2].title}
              currentStep={2}
              totalSteps={4}
              goBack={handleBack}
            >
              <div className="flex h-full flex-col justify-between py-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm">What best describes your work?</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {roles.map((r) => (
                        <div
                          key={r}
                          role="button"
                          className={cn(
                            "cursor-pointer rounded-lg border px-3 py-2 text-sm",
                            watchRole === r
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted/50",
                          )}
                          onClick={() =>
                            setValue("role", r, { shouldValidate: true })
                          }
                        >
                          {r}
                        </div>
                      ))}
                    </div>
                    {errors.role && (
                      <p className="text-sm text-destructive mt-2">
                        {errors.role.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-4 italic">
                      We will personalize your experience based on your
                      selection.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleNext}
                  className="mt-4 w-full"
                >
                  Continue
                </Button>
              </div>
            </OnboardingStepLeftWrapper>
            <OnboardingStepRightWrapper>
              <DashboardIllustration
                title={watchWorkspace || "Your Workspace"}
                tabs={getTabsForRole(watchRole)}
              />
            </OnboardingStepRightWrapper>
          </OnboardingStep>
        )}

        {/* Step 4: Review and Submit */}
        {currentStep === 3 && (
          <OnboardingStep>
            <OnboardingStepLeftWrapper
              title={steps[3].title}
              currentStep={3}
              totalSteps={4}
              goBack={handleBack}
            >
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6 py-4"
              >
                <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Name
                    </p>
                    <p>{watch("name")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Email
                    </p>
                    <p>{watch("email")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Workspace Name
                    </p>
                    <p>{watchWorkspace}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Role
                    </p>
                    <p>{watchRole}</p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive bg-destructive/10">
                    <p className="font-semibold">Failed to create account</p>
                    <p>{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating your account..." : "Create account"}
                </Button>
              </form>
            </OnboardingStepLeftWrapper>
            <OnboardingStepRightWrapper className="bg-gradient-to-t from-background to-muted">
              <DashboardIllustration
                variant="zoomed-in"
                title={watchWorkspace || "Welcome!"}
              />
            </OnboardingStepRightWrapper>
          </OnboardingStep>
        )}
      </div>

      <Dialog open={isOtpModalOpen} onOpenChange={setIsOtpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check your email</DialogTitle>
            <DialogDescription>
              We sent a 6-digit verification code to{" "}
              <span className="font-semibold text-foreground">
                {watch("email")}
              </span>
              . Please enter it below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4 items-center justify-center">
            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={otpValue}
              onChange={(value) => {
                setOtpValue(value);
                if (value.length === 6) {
                  handleVerifyOtp(value);
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
              <p className="text-sm text-muted-foreground animate-pulse">
                Verifying code...
              </p>
            )}

            {otpError && <p className="text-sm text-destructive">{otpError}</p>}

            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the code?{" "}
              {resendCooldown > 0 ? (
                <span className="text-muted-foreground/60">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-semibold text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  Resend code
                </button>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
