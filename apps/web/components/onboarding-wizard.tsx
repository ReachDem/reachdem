"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { bootstrapWorkspace } from "@/actions/onboarding";
import {
  OnboardingStep,
  OnboardingStepLeftWrapper,
  OnboardingStepRightWrapper,
  DashboardIllustration,
} from "@/components/onboarding1";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useSound } from "@/hooks/use-sound";
import { voiceoverPackFemaleReadySound } from "@/lib/voiceover-pack-female-ready";
import { voiceoverPackFighterFinalRoundSound } from "@/lib/voiceover-pack-fighter-final-round";
import { round1Sound } from "@/lib/round-1";
import { round2Sound } from "@/lib/round-2";
import { cn } from "@/lib/utils";
import { zodFormResolver } from "@/lib/zod-form-resolver";
import { authClient, signUp } from "@reachdem/auth/client";

const workspaceRoles = [
  "Software Engineer",
  "Product Manager",
  "Designer",
  "Founder",
  "Sales",
  "Marketing",
  "Other",
] as const;

type WorkspaceRole = (typeof workspaceRoles)[number];
type OnboardingMode = "email-signup" | "verify-email" | "account-setup";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  workspaceName: z
    .string()
    .min(2, "Workspace name must be at least 2 characters."),
  role: z.enum(workspaceRoles),
});

type FormValues = z.infer<typeof formSchema>;

interface OnboardingWizardProps {
  mode?: OnboardingMode;
  initialName?: string;
  initialEmail?: string;
}

export function OnboardingWizard({
  mode = "email-signup",
  initialName,
  initialEmail,
}: OnboardingWizardProps) {
  const router = useRouter();
  const isEmailSignup = mode === "email-signup";
  const isVerifyEmail = mode === "verify-email";
  const isAccountSetup = mode === "account-setup";
  const minimumStep = isAccountSetup ? 1 : 0;
  const totalSteps = isAccountSetup ? 3 : 4;
  const [currentStep, setCurrentStep] = useState(minimumStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(
      () => setResendCooldown((count) => count - 1),
      1000
    );
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
    resolver: zodFormResolver(formSchema),
    defaultValues: {
      name: initialName ?? "",
      email: initialEmail ?? "",
      password: isEmailSignup ? "" : "authenticated-user",
      workspaceName: "",
      role: "Software Engineer",
    },
  });

  const watchRole = watch("role");
  const watchWorkspace = watch("workspaceName");
  const watchEmail = watch("email");

  const steps = isVerifyEmail
    ? [
        { title: "Verify your email", fields: [] },
        { title: "Set up your workspace", fields: ["workspaceName"] },
        { title: "Tell us more about you", fields: ["role"] },
        { title: "Review and start", fields: [] },
      ]
    : [
        { title: "Set up your profile", fields: ["name", "email", "password"] },
        { title: "Set up your workspace", fields: ["workspaceName"] },
        { title: "Tell us more about you", fields: ["role"] },
        { title: "Review and start", fields: [] },
      ];

  const sendVerificationCode = async () => {
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email: watchEmail,
      type: "email-verification",
    });

    if (sendError) {
      setOtpError(sendError.message || "Failed to send verification code.");
      return false;
    }

    setOtpError(null);
    setOtpValue("");
    setVerificationEmailSent(true);
    setResendCooldown(15);
    setIsOtpModalOpen(true);
    return true;
  };

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].fields as (keyof FormValues)[];
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setError(null);
      setCurrentStep((step) => step + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((step) => Math.max(minimumStep, step - 1));
  };

  const finalizeWorkspace = async (
    workspaceName: string,
    role: WorkspaceRole
  ) => {
    const result = await bootstrapWorkspace({
      workspaceName,
      role,
    });

    if (result?.error) {
      return result.error;
    }

    router.replace("/");
    router.refresh();
    return null;
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!isEmailSignup) {
        const setupError = await finalizeWorkspace(
          data.workspaceName,
          data.role
        );

        if (setupError) {
          setError(setupError);
          setIsSubmitting(false);
          return;
        }

        return;
      }

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

      const sent = await sendVerificationCode();

      if (!sent) {
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setOtpLoading(true);
    setOtpError(null);

    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email: watchEmail,
        otp,
      });

      if (verifyError) {
        setOtpError(
          verifyError.message || "Invalid or expired verification code."
        );
        setOtpLoading(false);
        return;
      }

      if (isVerifyEmail) {
        setIsOtpModalOpen(false);
        setOtpLoading(false);
        setCurrentStep(1);
        return;
      }

      const setupError = await finalizeWorkspace(
        watch("workspaceName"),
        watch("role") as WorkspaceRole
      );

      if (setupError) {
        setOtpError(setupError);
        setOtpLoading(false);
        return;
      }
    } catch (err) {
      setOtpError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    await sendVerificationCode();
  };

  const roles = workspaceRoles;

  const getTabsForRole = (role: WorkspaceRole) => {
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

  const submitLabel = isEmailSignup ? "Create account" : "Finish setup";
  const submittingLabel = isEmailSignup
    ? "Creating your account..."
    : "Finalizing your workspace...";
  const failureTitle = isEmailSignup
    ? "Failed to create account"
    : "Failed to finish setup";

  return (
    <div className="flex min-h-svh items-center justify-center py-10">
      <div className="w-full max-w-5xl px-4">
        {currentStep === 0 && (
          <OnboardingStep>
            <OnboardingStepLeftWrapper
              title={steps[0].title}
              currentStep={0 - minimumStep}
              totalSteps={totalSteps}
            >
              {isVerifyEmail ? (
                <div className="space-y-6 py-4">
                  <div className="space-y-3">
                    <p className="text-sm leading-6">
                      You are signed in, but your account is not ready yet.
                      Verify <span className="font-semibold">{watchEmail}</span>{" "}
                      before creating your workspace.
                    </p>
                    <p className="text-muted-foreground text-sm leading-6">
                      We will send a 6-digit verification code and keep you in
                      setup until the account is fully provisioned.
                    </p>
                  </div>

                  {error && (
                    <div className="border-destructive/50 text-destructive bg-destructive/10 rounded-lg border p-4 text-sm">
                      <p className="font-semibold">Unable to continue</p>
                      <p>{error}</p>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      const sent = await sendVerificationCode();
                      if (!sent) {
                        setError("Failed to send verification code.");
                      }
                    }}
                    className="w-full"
                  >
                    {verificationEmailSent
                      ? "Send a new verification code"
                      : "Send verification code"}
                  </Button>
                </div>
              ) : (
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
                        <p className="text-destructive text-sm">
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
                        <p className="text-destructive text-sm">
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
                        <p className="text-destructive text-sm">
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
              )}
            </OnboardingStepLeftWrapper>
            <OnboardingStepRightWrapper>
              <DashboardIllustration
                userProfile={{
                  name: watch("name"),
                  email: watchEmail,
                }}
              />
            </OnboardingStepRightWrapper>
          </OnboardingStep>
        )}

        {currentStep === 1 && (
          <OnboardingStep>
            <OnboardingStepLeftWrapper
              title={steps[1].title}
              currentStep={1 - minimumStep}
              totalSteps={totalSteps}
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
                      <p className="text-destructive text-sm">
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
            <OnboardingStepRightWrapper className="from-background to-muted bg-gradient-to-b">
              <DashboardIllustration
                variant="zoomed-in"
                title={watchWorkspace || "Your Workspace"}
              />
            </OnboardingStepRightWrapper>
          </OnboardingStep>
        )}

        {currentStep === 2 && (
          <OnboardingStep>
            <OnboardingStepLeftWrapper
              title={steps[2].title}
              currentStep={2 - minimumStep}
              totalSteps={totalSteps}
              goBack={handleBack}
            >
              <div className="flex h-full flex-col justify-between py-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm">What best describes your work?</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {roles.map((role) => (
                        <div
                          key={role}
                          role="button"
                          className={cn(
                            "cursor-pointer rounded-lg border px-3 py-2 text-sm",
                            watchRole === role
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() =>
                            setValue("role", role, { shouldValidate: true })
                          }
                        >
                          {role}
                        </div>
                      ))}
                    </div>
                    {errors.role && (
                      <p className="text-destructive mt-2 text-sm">
                        {errors.role.message}
                      </p>
                    )}
                    <p className="text-muted-foreground mt-4 text-xs italic">
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

        {currentStep === 3 && (
          <OnboardingStep>
            <OnboardingStepLeftWrapper
              title={steps[3].title}
              currentStep={3 - minimumStep}
              totalSteps={totalSteps}
              goBack={handleBack}
            >
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6 py-4"
              >
                <div className="bg-muted/20 space-y-4 rounded-lg border p-4">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Name
                    </p>
                    <p>{watch("name")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Email
                    </p>
                    <p>{watchEmail}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Workspace Name
                    </p>
                    <p>{watchWorkspace}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Role
                    </p>
                    <p>{watchRole}</p>
                  </div>
                </div>

                {error && (
                  <div className="border-destructive/50 text-destructive bg-destructive/10 rounded-lg border p-4 text-sm">
                    <p className="font-semibold">{failureTitle}</p>
                    <p>{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? submittingLabel : submitLabel}
                </Button>
              </form>
            </OnboardingStepLeftWrapper>
            <OnboardingStepRightWrapper className="from-background to-muted bg-gradient-to-t">
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
              <span className="text-foreground font-semibold">
                {watchEmail}
              </span>
              . Please enter it below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
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
                Verifying code...
              </p>
            )}

            {otpError && <p className="text-destructive text-sm">{otpError}</p>}

            <p className="text-muted-foreground text-sm">
              Didn&apos;t receive the code?{" "}
              {resendCooldown > 0 ? (
                <span className="text-muted-foreground/60">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void handleResendOtp();
                  }}
                  className="text-foreground hover:text-primary font-semibold underline underline-offset-4 transition-colors"
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
