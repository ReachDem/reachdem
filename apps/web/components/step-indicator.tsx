"use client"

import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-all duration-300",
            i + 1 === currentStep
              ? "bg-[#6b7280] scale-125"
              : i + 1 < currentStep
                ? "bg-[#9ca3af]"
                : "bg-transparent border border-[#d1d5db]",
          )}
        />
      ))}
    </div>
  )
}
