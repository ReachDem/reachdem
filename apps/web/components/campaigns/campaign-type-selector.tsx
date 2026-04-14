"use client";

import { Mail, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignTypeSelectorProps {
  value: "email" | "sms" | null;
  onChange: (type: "email" | "sms") => void;
  disabled?: boolean;
}

export function CampaignTypeSelector({
  value,
  onChange,
  disabled = false,
}: CampaignTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Email Card */}
      <button
        type="button"
        onClick={() => onChange("email")}
        disabled={disabled}
        className={cn(
          "group hover:border-primary relative flex min-h-[200px] flex-col items-start justify-between rounded-lg border-2 p-6 text-left transition-all hover:shadow-md",
          value === "email"
            ? "border-primary bg-primary/5 shadow-md"
            : "border-border bg-background",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {/* Radio indicator */}
        <div className="absolute top-4 right-4">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
              value === "email"
                ? "border-primary bg-primary"
                : "border-muted-foreground/30 bg-background"
            )}
          >
            {value === "email" && (
              <div className="h-2 w-2 rounded-full bg-white" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold">Email</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Reach out with rich content, images, and personalized messages
            </p>
          </div>
        </div>

        {/* Footer hint */}
        <div className="text-muted-foreground mt-4 text-xs">
          Best for detailed communications
        </div>
      </button>

      {/* SMS Card */}
      <button
        type="button"
        onClick={() => onChange("sms")}
        disabled={disabled}
        className={cn(
          "group hover:border-primary relative flex min-h-[200px] flex-col items-start justify-between rounded-lg border-2 p-6 text-left transition-all hover:shadow-md",
          value === "sms"
            ? "border-primary bg-primary/5 shadow-md"
            : "border-border bg-background",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {/* Radio indicator */}
        <div className="absolute top-4 right-4">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
              value === "sms"
                ? "border-primary bg-primary"
                : "border-muted-foreground/30 bg-background"
            )}
          >
            {value === "sms" && (
              <div className="h-2 w-2 rounded-full bg-white" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold">SMS</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Direct messaging for quick, urgent communications
            </p>
          </div>
        </div>

        {/* Footer hint */}
        <div className="text-muted-foreground mt-4 text-xs">
          160 characters max, instant delivery
        </div>
      </button>
    </div>
  );
}
