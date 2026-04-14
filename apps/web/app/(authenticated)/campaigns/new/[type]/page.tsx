"use client";

import { notFound, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { format, startOfToday } from "date-fns";
import { toast } from "sonner";
import {
  createAndLaunchCampaign,
  createAndScheduleCampaign,
  createCampaign,
} from "@/actions/campaigns";

import { Button } from "@/components/ui/button";
import {
  EmailComposer,
  type EmailContent,
} from "@/components/campaigns/email-composer";
import {
  SmsComposerNew as SmsComposer,
  type SmsContent,
} from "@/components/campaigns/sms-composer-new";
import { AudienceTargetSelector } from "@/components/campaigns/audience-target-selector";
import { CampaignFormSkeleton } from "@/components/campaigns/campaign-form-skeleton";
import { useSegments } from "@/lib/hooks/use-segments";
import { useGroups } from "@/lib/hooks/use-groups";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  buildAudiencePayload,
  buildEmailCampaignContent,
  buildScheduledDateTime,
  buildSmsCampaignContent,
  CampaignFeatureCards,
  getPresetDate,
  isScheduledDateTimeInPast,
  optionalTrimmedString,
  SCHEDULE_PRESETS,
} from "@/components/campaigns/campaign-editor-shared";
import {
  fetchEmailSpamAnalysis,
  getEmailSpamWarningReasons,
  shouldWarnBeforeSendingEmail,
} from "@/lib/email-send-guard";
import { cn } from "@/lib/utils";

interface NewCampaignTypePageProps {
  params: Promise<{ type: string }>;
}

export default function NewCampaignTypePage({
  params,
}: NewCampaignTypePageProps) {
  return <CampaignFormClient params={params} />;
}

function CampaignFormClient({ params }: NewCampaignTypePageProps) {
  const router = useRouter();
  const [type, setType] = useState<"email" | "sms" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");

  // Email content state
  const [emailContent, setEmailContent] = useState<EmailContent>({
    subject: "",
    body: "",
    mode: "visual",
  });

  // SMS content state
  const [smsContent, setSmsContent] = useState<SmsContent>({
    text: "",
  });

  // Fetch segments and groups
  const {
    data: segmentsData,
    isLoading: isLoadingSegments,
    error: segmentsError,
  } = useSegments();
  const {
    data: groupsData,
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useGroups();

  // Show error toasts if API calls fail
  useEffect(() => {
    if (segmentsError) {
      toast.error("Failed to load segments");
      console.error("Segments error:", segmentsError);
    }
  }, [segmentsError]);

  useEffect(() => {
    if (groupsError) {
      toast.error("Failed to load groups");
      console.error("Groups error:", groupsError);
    }
  }, [groupsError]);

  const segments = segmentsData?.data || [];
  const groups = groupsData?.data || [];

  // Unwrap params and set default title once
  useEffect(() => {
    params.then((p) => {
      if (p.type !== "email" && p.type !== "sms") {
        notFound();
      }
      setType(p.type);
      // Set default title only once when type is determined
      setCampaignTitle(`New ${p.type === "email" ? "Email" : "SMS"} Campaign`);
    });
  }, [params]);

  if (!type) {
    return <CampaignFormSkeleton />;
  }

  const handleSaveDraft = async () => {
    console.log("[Campaign] Starting save draft...");
    console.log("[Campaign] Type:", type);
    console.log("[Campaign] Title:", campaignTitle);
    console.log("[Campaign] Selected Segment:", selectedSegmentId);
    console.log("[Campaign] Selected Group:", selectedGroupId);

    setIsLoading(true);

    try {
      // Validate basic fields
      if (!campaignTitle.trim()) {
        const error = "Campaign title is required";
        console.error("[Campaign] Validation error:", error);
        toast.error(error);
        return;
      }

      // Prepare content based on type
      const content =
        type === "email"
          ? buildEmailCampaignContent(emailContent, campaignTitle)
          : buildSmsCampaignContent(smsContent);

      const result = await createCampaign({
        name: campaignTitle.trim(),
        description: optionalTrimmedString(campaignDescription),
        channel: type as "sms" | "email",
        content,
        audienceGroups: selectedGroupId ? [selectedGroupId] : [],
        audienceSegments: selectedSegmentId ? [selectedSegmentId] : [],
      });
      console.log("[Campaign] Draft saved successfully:", result);

      toast.success("Draft saved successfully");
      console.log("[Campaign] Draft save completed");

      // Redirect to edit page
      router.replace(`/campaigns/${result.data.id}/edit`);
    } catch (error) {
      console.error("[Campaign] Error saving draft:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to save draft: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async (skipSpamWarning = false) => {
    console.log("[Campaign] Starting schedule...");
    console.log("[Campaign] Scheduled Date:", scheduledDate);
    console.log("[Campaign] Scheduled Time:", scheduledTime);

    if (!scheduledDate) {
      const error = "Please choose a schedule date";
      console.error("[Campaign] Validation error:", error);
      toast.error(error);
      return;
    }

    if (isScheduledDateTimeInPast(scheduledDate, scheduledTime)) {
      const error = "Please choose a future date and time";
      console.error("[Campaign] Validation error:", error);
      toast.error(error);
      return;
    }

    // Validate content
    if (type === "email") {
      if (!emailContent.body.trim()) {
        const error = "Please enter email content";
        console.error("[Campaign] Validation error:", error);
        toast.error(error);
        return;
      }
    } else if (type === "sms") {
      if (!smsContent.text.trim()) {
        const error = "Please enter SMS message";
        console.error("[Campaign] Validation error:", error);
        toast.error(error);
        return;
      }
      if (smsContent.text.length > 1600) {
        const error = "SMS message exceeds 1600 character limit";
        console.error("[Campaign] Validation error:", error);
        toast.error(error);
        return;
      }
    }

    // Validate audience
    if (!selectedSegmentId && !selectedGroupId) {
      const error = "Please select a target audience (segment or group)";
      console.error("[Campaign] Validation error:", error);
      toast.error(error);
      return;
    }

    // Combine date and time
    const scheduledDateTime = buildScheduledDateTime(
      scheduledDate,
      scheduledTime
    );

    console.log(
      "[Campaign] Scheduled DateTime:",
      scheduledDateTime.toISOString()
    );

    const content =
      type === "email"
        ? buildEmailCampaignContent(
            {
              ...emailContent,
            },
            campaignTitle
          )
        : buildSmsCampaignContent({
            ...smsContent,
            text: smsContent.text.trim(),
          });

    if (!skipSpamWarning && type === "email") {
      const analysis = await fetchEmailSpamAnalysis({
        subject: (content as any).subject,
        htmlContent: (content as any).html,
      });

      if (shouldWarnBeforeSendingEmail(analysis)) {
        toast.warning("Ce message risque d'être classé comme spam.", {
          description: getEmailSpamWarningReasons(analysis).join(" "),
          duration: 20000,
          action: {
            label: "Programmer quand même",
            onClick: () => {
              void handleSchedule(true);
            },
          },
          cancel: { label: "Revoir", onClick: () => {} },
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      await createAndScheduleCampaign({
        name: campaignTitle.trim(),
        description: optionalTrimmedString(campaignDescription),
        channel: type,
        content,
        scheduledAt: scheduledDateTime.toISOString(),
        audienceGroups: selectedGroupId ? [selectedGroupId] : [],
        audienceSegments: selectedSegmentId ? [selectedSegmentId] : [],
      });

      toast.success(
        `Campaign scheduled for ${format(scheduledDateTime, "dd.MM.yyyy")} at ${format(scheduledDateTime, "HH:mm")}`
      );
      console.log("[Campaign] Schedule completed");
      setIsScheduleOpen(false);
      router.push("/campaigns");
    } catch (error) {
      console.error("[Campaign] Error scheduling campaign:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to schedule campaign: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async (skipSpamWarning = false) => {
    console.log("[Campaign] Starting launch...");
    console.log("[Campaign] Type:", type);
    console.log("[Campaign] Title:", campaignTitle);
    console.log("[Campaign] Selected Segment:", selectedSegmentId);
    console.log("[Campaign] Selected Group:", selectedGroupId);

    // Validate content based on type
    if (type === "email") {
      console.log("[Campaign] Email Subject:", emailContent.subject);
      console.log("[Campaign] Email Body Length:", emailContent.body.length);

      if (!emailContent.body.trim()) {
        const error = "Please enter email content";
        console.error("[Campaign] Validation error:", error);
        toast.error(error);
        return;
      }
    } else if (type === "sms") {
      console.log("[Campaign] SMS Text:", smsContent.text);
      console.log("[Campaign] SMS Length:", smsContent.text.length);

      if (!smsContent.text.trim()) {
        const error = "Please enter SMS message";
        console.error("[Campaign] Validation error:", error);
        toast.error(error);
        return;
      }
      if (smsContent.text.length > 1600) {
        const error = "SMS message exceeds 1600 character limit";
        console.error("[Campaign] Validation error:", error);
        toast.error(error);
        return;
      }
    }

    // Validate audience
    if (!selectedSegmentId && !selectedGroupId) {
      const error = "Please select a target audience (segment or group)";
      console.error("[Campaign] Validation error:", error);
      toast.error(error);
      return;
    }

    const content =
      type === "email"
        ? buildEmailCampaignContent(
            {
              ...emailContent,
            },
            campaignTitle
          )
        : buildSmsCampaignContent({
            ...smsContent,
            text: smsContent.text.trim(),
          });

    if (!skipSpamWarning && type === "email") {
      const analysis = await fetchEmailSpamAnalysis({
        subject: (content as any).subject,
        htmlContent: (content as any).html,
      });

      if (shouldWarnBeforeSendingEmail(analysis)) {
        toast.warning("Ce message risque d'être classé comme spam.", {
          description: getEmailSpamWarningReasons(analysis).join(" "),
          duration: 20000,
          action: {
            label: "Lancer quand même",
            onClick: () => {
              void handleLaunch(true);
            },
          },
          cancel: { label: "Revoir", onClick: () => {} },
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      await createAndLaunchCampaign({
        name: campaignTitle.trim(),
        description: optionalTrimmedString(campaignDescription),
        channel: type,
        content,
        audienceGroups: selectedGroupId ? [selectedGroupId] : [],
        audienceSegments: selectedSegmentId ? [selectedSegmentId] : [],
      });

      toast.success("Campaign launched successfully");
      console.log("[Campaign] Launch completed");
      router.push("/campaigns");
    } catch (error) {
      console.error("[Campaign] Error launching campaign:", error);
      console.error(
        "[Campaign] Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to launch campaign: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleSummary = scheduledDate
    ? `${format(scheduledDate, "EEE, MMM d")} at ${scheduledTime}`
    : "Pick date and time";
  const scheduledButtonLabel = scheduledDate ? "Scheduled at" : "Schedule";
  const scheduledButtonHover = scheduledDate
    ? `${format(scheduledDate, "dd.MM.yyyy")} at ${scheduledTime.replace(":", "h")}`
    : undefined;

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <header>
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-6 px-4 py-4">
          <div className="flex-1 space-y-2">
            <Input
              value={campaignTitle}
              onChange={(event) => setCampaignTitle(event.target.value)}
              placeholder={`Campaign ${type === "email" ? "title" : "name"}`}
              className="h-auto border-0 px-0 text-4xl font-medium shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <Input
              value={campaignDescription}
              onChange={(event) => setCampaignDescription(event.target.value)}
              placeholder="Add a short description"
              className="text-muted-foreground h-auto w-md border-0 px-0 py-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </div>

          <Button
            variant="ghost"
            className="text-muted-foreground shrink-0 self-start text-lg font-light"
            onClick={handleSaveDraft}
            disabled={isLoading}
          >
            save as draft
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-8 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Target Audience Selector */}
          <AudienceTargetSelector
            segments={segments}
            groups={groups}
            selectedSegmentId={selectedSegmentId}
            selectedGroupId={selectedGroupId}
            onSegmentChange={setSelectedSegmentId}
            onGroupChange={setSelectedGroupId}
            disabled={isLoading || isLoadingSegments || isLoadingGroups}
          />

          {/* Composer */}
          <div className="bg-muted/30 rounded-lg border p-6">
            {type === "email" ? (
              <EmailComposer
                value={emailContent}
                onChange={setEmailContent}
                disabled={isLoading}
              />
            ) : (
              <SmsComposer
                value={smsContent}
                onChange={setSmsContent}
                disabled={isLoading}
              />
            )}
          </div>

          <div className="flex justify-end">
            <div className="inline-flex items-stretch overflow-hidden rounded-lg border">
              <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    className={cn(
                      "h-11 rounded-none border-r px-5",
                      scheduledDate &&
                        "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                    )}
                    disabled={isLoading}
                    title={scheduledButtonHover}
                  >
                    <CalendarDaysIcon className="h-4 w-4" />
                    {scheduledButtonLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[360px] p-0">
                  <div className="space-y-4 p-4">
                    <div>
                      <p className="text-sm font-semibold">Schedule campaign</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {scheduleSummary}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {SCHEDULE_PRESETS.map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() =>
                            setScheduledDate(getPresetDate(preset))
                          }
                        >
                          {preset}
                        </Button>
                      ))}
                    </div>

                    <div className="rounded-lg border">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < startOfToday()}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Time</label>
                      <Input
                        type="time"
                        step="60"
                        value={scheduledTime}
                        onChange={(event) =>
                          setScheduledTime(event.target.value)
                        }
                        min={
                          scheduledDate &&
                          format(scheduledDate, "yyyy-MM-dd") ===
                            format(new Date(), "yyyy-MM-dd")
                            ? format(new Date(), "HH:mm")
                            : undefined
                        }
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleSchedule()}
                      disabled={isLoading}
                    >
                      {isLoading ? "SCHEDULING..." : "Schedule Campaign"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                className="h-11 rounded-none px-6"
                onClick={() => handleLaunch()}
                disabled={isLoading}
              >
                {isLoading ? "LAUNCHING..." : "Launch"}
              </Button>
            </div>
          </div>

          {/* Feature Cards */}
          <Separator />
          <CampaignFeatureCards />
        </div>
      </main>
    </div>
  );
}
