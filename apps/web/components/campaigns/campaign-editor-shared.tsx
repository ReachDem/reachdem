import {
  BeakerIcon,
  CalendarDaysIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { addDays, startOfToday } from "date-fns";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { EmailContent } from "@/components/campaigns/email-composer";
import type { SmsContent } from "@/components/campaigns/sms-composer-new";

export const SCHEDULE_PRESETS = [
  "Wednesday",
  "Friday",
  "In a week",
  "Tomorrow",
  "Today",
] as const;

function getNextWeekday(targetDay: number) {
  const today = startOfToday();
  const dayOffset = (targetDay - today.getDay() + 7) % 7 || 7;

  return addDays(today, dayOffset);
}

export function getPresetDate(preset: (typeof SCHEDULE_PRESETS)[number]) {
  switch (preset) {
    case "Today":
      return startOfToday();
    case "Tomorrow":
      return addDays(startOfToday(), 1);
    case "In a week":
      return addDays(startOfToday(), 7);
    case "Wednesday":
      return getNextWeekday(3);
    case "Friday":
      return getNextWeekday(5);
  }
}

export function buildEmailCampaignContent(
  content: EmailContent,
  fallbackSubject?: string
) {
  return {
    subject:
      content.subject.trim() || fallbackSubject?.trim() || "Untitled Email",
    html: content.body || "<p>Empty email</p>",
    from: content.fromName?.trim() || undefined,
    bodyJson: content.bodyJson,
    mode: content.mode,
    fontFamily: content.fontFamily,
    fontWeights: content.fontWeights,
  };
}

export function buildSmsCampaignContent(content: SmsContent) {
  return {
    text: content.text || "Empty SMS",
    from: content.senderId || undefined,
    senderId: content.senderId,
  };
}

export function optionalTrimmedString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildScheduledDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const scheduledDateTime = new Date(date);
  scheduledDateTime.setHours(hours, minutes, 0, 0);
  return scheduledDateTime;
}

export function isScheduledDateTimeInPast(date: Date, time: string) {
  return buildScheduledDateTime(date, time).getTime() <= Date.now();
}

export function buildAudiencePayload(
  selectedSegmentId: string,
  selectedGroupId: string
) {
  return {
    audiences: [
      ...(selectedSegmentId
        ? [{ sourceType: "segment" as const, sourceId: selectedSegmentId }]
        : []),
      ...(selectedGroupId
        ? [{ sourceType: "group" as const, sourceId: selectedGroupId }]
        : []),
    ],
  };
}

function FeatureCard({
  icon,
  title,
  description,
  iconColor,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  iconColor: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg border px-4 py-4">
      <div>
        <div>
          <div className="flex items-center justify-between pr-2">
            <h3 className="text-sm font-semibold tracking-wide uppercase">
              {title}
            </h3>
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-lg",
                iconColor
              )}
            >
              {icon}
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CampaignFeatureCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FeatureCard
        icon={<SparklesIcon className="h-5 w-5" />}
        title="AI SUBJECT OPTIMIZER"
        description="Let AI analyze your copy to generate high-open-rate subject lines for your segment."
        iconColor=""
      />
      <FeatureCard
        icon={<BeakerIcon className="h-5 w-5" />}
        title="A/B TESTING"
        description="Set up an alternate version of this email to see which content drives more conversions."
        iconColor=""
      />
      <FeatureCard
        icon={<CalendarDaysIcon className="h-5 w-5" />}
        title="SMART SCHEDULING"
        description="Automatically send when your recipients are most likely to be in their inboxes."
        iconColor=""
      />
    </div>
  );
}
