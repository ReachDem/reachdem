"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodFormResolver } from "@/lib/zod-form-resolver";
import { signUp, signIn } from "@reachdem/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { PASSWORD_REGEX, PASSWORD_RULES } from "@reachdem/shared";
import { completeRegistrationConsent } from "@/actions/onboarding";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "8 characters minimum")
    .regex(PASSWORD_REGEX.hasUppercase, "One uppercase letter required")
    .regex(PASSWORD_REGEX.hasLowercase, "One lowercase letter required")
    .regex(PASSWORD_REGEX.hasNumber, "One number required")
    .regex(PASSWORD_REGEX.hasSpecialChar, "One special character required"),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, "You must accept the terms"),
});

type FormValues = z.infer<typeof formSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodFormResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      acceptTerms: false,
    },
    mode: "onTouched", // Live validation on blur
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = form;
  const passwordValue = watch("password");
  const acceptTermsValue = watch("acceptTerms");

  const passwordChecks = [
    { label: "8 characters minimum", test: (v: string) => v.length >= 8 },
    {
      label: "One uppercase",
      test: (v: string) => PASSWORD_REGEX.hasUppercase.test(v),
    },
    {
      label: "One lowercase",
      test: (v: string) => PASSWORD_REGEX.hasLowercase.test(v),
    },
    {
      label: "One number",
      test: (v: string) => PASSWORD_REGEX.hasNumber.test(v),
    },
    {
      label: "One special character",
      test: (v: string) => PASSWORD_REGEX.hasSpecialChar.test(v),
    },
  ];

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const { error: signUpError } = await signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
      });

      if (signUpError) {
        if (signUpError.message.includes("exists")) {
          setServerError("An account already exists with this email address.");
        } else {
          setServerError(signUpError.message || "Error during signup.");
        }
        setIsSubmitting(false);
        return;
      }

      // Save consent + names, and initialize onboarding state
      const consentResult = await completeRegistrationConsent({
        firstName: data.firstName,
        lastName: data.lastName,
      });

      if (consentResult.error) {
        setServerError("Unexpected error after signup.");
        setIsSubmitting(false);
        return;
      }

      router.push("/verify-email");
    } catch (err) {
      setServerError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/register/consent",
    });
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center justify-center text-center">
        <div className="mb-4 flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            {/* Same Logo as in app/layout or typical ReachDem logo */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">ReachDem</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Start for free, no credit card required.
        </p>
      </div>

      <div className="bg-background w-full rounded-2xl border p-8 shadow-xl">
        {/* 
      <Button
        type="button"
        variant="outline"
        className="w-full mb-6 relative hover:bg-muted/50"
        onClick={handleGoogleSignup}
      >
        <img
          src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/google-icon.svg"
          alt="Google"
          className="mr-2 size-4"
        />
        Continue with Google
      </Button> */}

        {/* <div className="relative mb-6 text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="bg-background text-muted-foreground relative z-10 px-2">
          or 
        </span>
      </div> */}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="John"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-destructive text-xs">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-destructive text-xs">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@company.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-destructive text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            {passwordValue && (
              <div className="bg-muted/30 mt-3 space-y-1 rounded-md p-3">
                {passwordChecks.map((check, idx) => {
                  const passed = check.test(passwordValue);
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center text-xs",
                        passed
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {passed ? (
                        <Check className="mr-2 size-3" />
                      ) : (
                        <div className="mr-2 size-3 rounded-full border border-current opacity-50" />
                      )}
                      {check.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="acceptTerms"
              checked={acceptTermsValue}
              onCheckedChange={(checked) =>
                form.setValue("acceptTerms", checked as boolean, {
                  shouldValidate: true,
                })
              }
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="acceptTerms"
                className="text-muted-foreground cursor-pointer text-xs leading-tight font-medium"
              >
                I accept the{" "}
                <a
                  href="#"
                  className="text-foreground font-medium hover:underline"
                >
                  Terms of Service
                </a>{" "}
                and the{" "}
                <a
                  href="#"
                  className="text-foreground font-medium hover:underline"
                >
                  Privacy Policy
                </a>
              </label>
              {errors.acceptTerms && (
                <p className="text-destructive mt-1 text-xs">
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>
          </div>

          {serverError && (
            <div className="bg-destructive/10 text-destructive flex items-center space-x-2 rounded-md p-3 text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <p>{serverError}</p>
              {serverError.includes("exists") && (
                <a
                  href="/login"
                  className="ml-auto font-semibold hover:underline"
                >
                  Sign in
                </a>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || !acceptTermsValue || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create my account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-foreground hover:text-primary font-semibold transition-colors hover:underline"
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
