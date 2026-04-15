"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  OnboardingStep,
  OnboardingStepLeftWrapper,
  OnboardingStepRightWrapper,
  DashboardIllustration,
} from "@/components/onboarding1";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodFormResolver } from "@/lib/zod-form-resolver";
import { createWorkspace } from "@/actions/onboarding";

const formSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  workspaceName: z.string().min(1, "Workspace name is required"),
  country: z.string().min(1, "Country is required"),
});

export default function WorkspaceSetupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodFormResolver(formSchema),
    defaultValues: {
      companyName: "",
      workspaceName: "",
      country: "Cameroon", // Default to Cameroon as per spec prioritization
    },
  });

  const watchCompanyName = watch("companyName");
  const watchWorkspaceName = watch("workspaceName");

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue("companyName", newValue);
    if (!watchWorkspaceName || watchWorkspaceName === watchCompanyName) {
      setValue("workspaceName", newValue, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setError(null);

    const result = await createWorkspace(data);

    if ("error" in result && result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push("/setup/profile");
  };

  return (
    <OnboardingStep>
      <OnboardingStepLeftWrapper
        title="Set up your workspace"
        currentStep={0} // Step index 0
        totalSteps={4}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Inc."
                {...register("companyName")}
                onChange={handleCompanyNameChange}
              />
              {errors.companyName && (
                <p className="text-destructive text-sm">
                  {errors.companyName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace Name</Label>
              <Input
                id="workspaceName"
                placeholder="Acme"
                {...register("workspaceName")}
              />
              {errors.workspaceName && (
                <p className="text-destructive text-sm">
                  {errors.workspaceName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                {...register("country")}
              >
                <option value="Cameroon">Cameroon</option>
                <option value="France">France</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Other">Other</option>
              </select>
              {errors.country && (
                <p className="text-destructive text-sm">
                  {errors.country.message}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="border-destructive/50 text-destructive bg-destructive/10 rounded-lg border p-4 text-sm">
              <p>{error}</p>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="mt-4 w-full">
            {isSubmitting ? "Creating workspace..." : "Continue"}
          </Button>
        </form>
      </OnboardingStepLeftWrapper>
      <OnboardingStepRightWrapper className="from-background to-muted bg-gradient-to-b">
        <DashboardIllustration
          variant="zoomed-in"
          title={watchWorkspaceName || "Your Workspace"}
        />
      </OnboardingStepRightWrapper>
    </OnboardingStep>
  );
}
