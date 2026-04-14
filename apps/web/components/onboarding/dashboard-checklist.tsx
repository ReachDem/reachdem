import {
  getDashboardChecklistState,
  dismissChecklist,
} from "@/actions/dashboard-onboarding";
import { Check, ChevronRight, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ChecklistStepsClient } from "./dashboard-checklist-client";

export async function DashboardChecklist() {
  const result = await getDashboardChecklistState();

  if (!result || "error" in result || result.dismissed || !result.steps) {
    return null;
  }

  const { steps } = result;

  if (steps.length === 0) {
    return null;
  }

  const completedCount = steps.filter((step) => step.status === "done").length;

  if (completedCount === steps.length) {
    return null;
  }

  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const currentStepIndex = steps.findIndex((step) => step.status !== "done");
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="px-4 lg:px-6">
      <section className="bg-card text-card-foreground relative w-full overflow-hidden rounded-md border shadow-sm">
        <div className="p-6 sm:p-8 lg:p-10">
          <form
            action={async () => {
              "use server";
              await dismissChecklist();
            }}
            className="absolute top-4 right-4 z-10"
          >
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              aria-label="Dismiss checklist"
              title="Hide checklist"
              className="text-muted-foreground hover:bg-muted hover:text-foreground size-8 rounded-full"
            >
              <X className="size-4" />
            </Button>
          </form>

          <div className="mx-auto flex w-full max-w-3xl flex-col">
            {/* Header area with progress */}
            <div className="mb-8 pr-6 pl-12">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Onboarding Progress
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Complete these steps to get the most out of ReachDem.
                  </p>
                </div>
                <span className="text-muted-foreground text-sm font-medium">
                  {progressPercent}%
                </span>
              </div>
              <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <ChecklistStepsClient steps={steps} />
          </div>
        </div>
      </section>
    </div>
  );
}
