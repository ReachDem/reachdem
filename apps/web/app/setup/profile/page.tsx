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
import { cn } from "@/lib/utils";
import { savePrimaryRole } from "@/actions/onboarding";
import { ReachDemRole } from "@reachdem/shared";
import { Briefcase, Megaphone, Terminal, Lightbulb } from "lucide-react";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<ReachDemRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    {
      value: "ENTREPRENEUR" as ReachDemRole,
      title: "Entrepreneur",
      description: "Building a business and managing all aspects",
      icon: <Lightbulb className="size-5" />,
    },
    {
      value: "MARKETER" as ReachDemRole,
      title: "Marketer",
      description: "Running campaigns and driving acquisition",
      icon: <Megaphone className="size-5" />,
    },
    {
      value: "SALES" as ReachDemRole,
      title: "Sales",
      description: "Managing leads and closing deals",
      icon: <Briefcase className="size-5" />,
    },
    {
      value: "DEVELOPER" as ReachDemRole,
      title: "Developer",
      description: "Integrating APIs and building tools",
      icon: <Terminal className="size-5" />,
    },
  ];

  const onSubmit = async () => {
    if (!role) {
      setError("Please select a role to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await savePrimaryRole(role);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push("/setup/acquisition");
  };

  const [hoveredRole, setHoveredRole] = useState<ReachDemRole | null>(null);

  const getTabsForRole = (r: ReachDemRole | null) => {
    switch (r) {
      case "ENTREPRENEUR":
        return [
          "Dashboard",
          "Analytics",
          "Team Directory",
          "Billing",
          "Settings",
        ];
      case "MARKETER":
        return [
          "Campaigns",
          "Analytics",
          "Social Media",
          "Content",
          "Settings",
        ];
      case "SALES":
        return ["CRM", "Leads", "Pipeline", "Contracts", "Settings"];
      case "DEVELOPER":
        return ["API Keys", "Webhooks", "Logs", "Documentation", "Settings"];
      default:
        return ["Dashboard", "Projects", "Tasks", "Activity", "Settings"];
    }
  };

  const displayRole = role || hoveredRole || "ENTREPRENEUR";

  return (
    <OnboardingStep>
      <OnboardingStepLeftWrapper
        title="Tell us more about you"
        currentStep={1} // Step index 1
        totalSteps={4}
      >
        <div className="flex h-full flex-col justify-between py-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm">What best describes your primary role?</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roles.map((r) => (
                  <div
                    key={r.value}
                    role="button"
                    onMouseEnter={() => setHoveredRole(r.value)}
                    onMouseLeave={() => setHoveredRole(null)}
                    className={cn(
                      "hover:border-primary/50 flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-all hover:shadow-sm",
                      role === r.value
                        ? "border-primary bg-primary/5 ring-primary ring-1"
                        : "bg-background"
                    )}
                    onClick={() => {
                      setRole(r.value);
                      setError(null);
                    }}
                  >
                    <div
                      className={cn(
                        "w-fit rounded-lg p-2",
                        role === r.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {r.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {r.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-muted-foreground mt-4 text-xs italic">
                We will personalize your experience based on your selection.
              </p>
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
            className="mt-4 w-full"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </div>
      </OnboardingStepLeftWrapper>
      <OnboardingStepRightWrapper>
        <DashboardIllustration
          title={
            roles.find((r) => r.value === displayRole)?.title ||
            "Your Workspace"
          }
          tabs={getTabsForRole(displayRole)}
        />
      </OnboardingStepRightWrapper>
    </OnboardingStep>
  );
}
