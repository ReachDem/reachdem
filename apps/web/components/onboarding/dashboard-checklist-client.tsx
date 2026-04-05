"use client";

import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardChecklistStep } from "@reachdem/shared";
import { useTipsEngine } from "./tips-engine";
import { SenderIdDialog } from "./sender-id-dialog";
import { useState } from "react";

function StepItem({
  step,
  index,
  activeIndex,
  onOpenStep1Dialog,
}: {
  step: DashboardChecklistStep;
  index: number;
  activeIndex: number;
  onOpenStep1Dialog: () => void;
}) {
  const isDone = step.status === "done";
  const isActive = !isDone && index === activeIndex;

  const handleContinue = (e: React.MouseEvent) => {
    if (step.id === "step1") {
      e.preventDefault();
      onOpenStep1Dialog();
    }
  };

  return (
    <div className="relative flex items-start gap-4 sm:gap-5">
      <div
        className={[
          "relative z-10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors duration-300",
          isDone
            ? "border-primary bg-primary text-primary-foreground"
            : isActive
              ? "border-primary bg-primary/10 text-primary"
              : "border-muted-foreground/30 bg-card text-muted-foreground",
        ].join(" ")}
      >
        {isDone ? <Check className="size-4" /> : index + 1}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-foreground text-base font-medium tracking-tight">
              {step.title}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {step.description}
            </p>
          </div>

          <div className="relative">
            {step.href ? (
              <Button
                variant={isDone ? "ghost" : "secondary"}
                size="sm"
                className="h-8 w-fit rounded-full px-4 text-xs font-medium"
                onClick={handleContinue}
                asChild={step.id !== "step1"}
              >
                {step.id === "step1" ? (
                  <>
                    {isDone ? "Review" : "Continue"}
                    <ChevronRight className="ml-1 size-3.5" />
                  </>
                ) : (
                  <Link href={step.href}>
                    {isDone ? "Review" : "Continue"}
                    <ChevronRight className="ml-1 size-3.5" />
                  </Link>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChecklistStepsClient({
  steps,
}: {
  steps: DashboardChecklistStep[];
}) {
  const currentStepIndex = steps.findIndex((step) => step.status !== "done");
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;
  const [isSenderIdDialogOpen, setIsSenderIdDialogOpen] = useState(false);

  return (
    <>
      <div className="relative flex flex-col gap-6 sm:gap-8">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Vertical connecting line */}
            {index < steps.length - 1 && (
              <div className="bg-border absolute top-10 left-4 h-[calc(100%+0.5rem)] w-px -translate-x-1/2 sm:h-[calc(100%+1rem)]" />
            )}
            <StepItem
              step={step}
              index={index}
              activeIndex={activeIndex}
              onOpenStep1Dialog={() => setIsSenderIdDialogOpen(true)}
            />
          </div>
        ))}
      </div>

      <SenderIdDialog
        open={isSenderIdDialogOpen}
        onOpenChange={setIsSenderIdDialogOpen}
      />
    </>
  );
}
