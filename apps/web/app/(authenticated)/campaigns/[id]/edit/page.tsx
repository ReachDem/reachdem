"use client";

import { notFound, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  BeakerIcon,
  CalendarDaysIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { addDays, format, startOfToday, isPast } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { cn } from "@/lib/utils";

interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

const SCHEDULE_PRESETS = [
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

function getPresetDate(preset: (typeof SCHEDULE_PRESETS)[number]) {
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

export default function EditCampaignPage({ params }: EditCampaignPageProps) {
  return <EditCampaignClient params={params} />;
}

function EditCampaignClient({ params }: EditCampaignPageProps) {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);
  const [type, setType] = useState<"email" | "sms" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [isFailedCampaign, setIsFailedCampaign] = useState(false);

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

  // Unwrap params and fetch campaign
  useEffect(() => {
    params.then(async (p) => {
      setCampaignId(p.id);

      try {
        const response = await fetch(`/api/v1/campaigns/${p.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch campaign");
        }

        const data = await response.json();
        console.log("[Edit Campaign] Loaded campaign:", data);

        // Check if campaign can be edited
        if (data.status !== "draft" && data.status !== "failed") {
          toast.error("Only draft and failed campaigns can be edited");
          router.push("/campaigns");
          return;
        }

        setCampaign(data);
        setType(data.channel);
        setCampaignTitle(data.name);
        setCampaignDescription(data.description || "");
        setIsFailedCampaign(data.status === "failed");

        // Pre-fill content based on channel
        if (data.channel === "email") {
          setEmailContent({
            subject: data.content?.subject || "",
            body: data.content?.html || "",
            mode: "visual",
            fontFamily: data.content?.fontFamily,
            fontWeights: data.content?.fontWeights,
          });
        } else if (data.channel === "sms") {
          setSmsContent({
            text: data.content?.text || "",
            senderId: data.content?.senderId,
          });
        }

        // Pre-fill audience (fetch from audience API)
        try {
          const audienceResponse = await fetch(
            `/api/v1/campaigns/${p.id}/audience`
          );
          if (audienceResponse.ok) {
            const audienceData = await audienceResponse.json();
            console.log("[Edit Campaign] Loaded audience:", audienceData);

            // Set selected segment or group
            if (audienceData.data && audienceData.data.length > 0) {
              const firstAudience = audienceData.data[0];
              if (firstAudience.sourceType === "segment") {
                setSelectedSegmentId(firstAudience.sourceId);
              } else if (firstAudience.sourceType === "group") {
                setSelectedGroupId(firstAudience.sourceId);
              }
            }
          }
        } catch (error) {
          console.error("[Edit Campaign] Failed to load audience:", error);
        }

        // Pre-fill scheduled date if exists and not in the past
        if (data.scheduledAt) {
          const scheduledDateTime = new Date(data.scheduledAt);
          if (!isPast(scheduledDateTime)) {
            setScheduledDate(scheduledDateTime);
            setScheduledTime(format(scheduledDateTime, "HH:mm"));
          }
        }
      } catch (error) {
        console.error("[Edit Campaign] Error loading campaign:", error);
        toast.error("Failed to load campaign");
        router.push("/campaigns");
      } finally {
        setIsLoadingCampaign(false);
      }
    });
  }, [params, router]);

  if (isLoadingCampaign || !type) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleSaveDraft = async () => {
    console.log("[Edit Campaign] Starting save draft...");

    setIsLoading(true);

    try {
      // Validate basic fields
      if (!campaignTitle.trim()) {
        const error = "Campaign title is required";
        console.error("[Edit Campaign] Validation error:", error);
        toast.error(error);
        return;
      }

      // Prepare content based on type
      let content;
      if (type === "email") {
        content = {
          subject: emailContent.subject || "Untitled Email",
          html: emailContent.body || "<p>Empty email</p>",
          fontFamily: emailContent.fontFamily,
          fontWeights: emailContent.fontWeights,
        };
      } else {
        content = {
          text: smsContent.text || "Empty SMS",
          senderId: smsContent.senderId,
        };
      }

      // Prepare payload
      const payload = {
        name: campaignTitle.trim(),
        description: campaignDescription.trim() || null,
        content,
      };

      console.log("[Edit Campaign] Updating draft with payload:", payload);

      // Update campaign
      const response = await fetch(`/api/v1/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[Edit Campaign] API error response:", errorData);
        throw new Error(
          errorData.error || errorData.details || "Failed to save draft"
        );
      }

      const result = await response.json();
      console.log("[Edit Campaign] Draft saved successfully:", result);

      toast.success("Draft saved successfully");
      router.push("/campaigns");
    } catch (error) {
      console.error("[Edit Campaign] Error saving draft:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to save draft: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    console.log("[Edit Campaign] Starting schedule...");

    if (!scheduledDate) {
      const error = "Please choose a schedule date";
      console.error("[Edit Campaign] Validation error:", error);
      toast.error(error);
      return;
    }

    // Validate content
    if (type === "email") {
      if (!emailContent.subject.trim()) {
        toast.error("Please enter an email subject");
        return;
      }
      if (!emailContent.body.trim()) {
        toast.error("Please enter email content");
        return;
      }
    } else if (type === "sms") {
      if (!smsContent.text.trim()) {
        toast.error("Please enter SMS message");
        return;
      }
      if (smsContent.text.length > 1600) {
        toast.error("SMS message exceeds 1600 character limit");
        return;
      }
    }

    // Validate audience
    if (!selectedSegmentId && !selectedGroupId) {
      toast.error("Please select a target audience (segment or group)");
      return;
    }

    setIsLoading(true);

    try {
      // Combine date and time
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      // Prepare content
      let content;
      if (type === "email") {
        content = {
          subject: emailContent.subject.trim(),
          html: emailContent.body,
          fontFamily: emailContent.fontFamily,
          fontWeights: emailContent.fontWeights,
        };
      } else {
        content = {
          text: smsContent.text.trim(),
          senderId: smsContent.senderId,
        };
      }

      // If failed campaign, create new one
      if (isFailedCampaign) {
        const campaignPayload = {
          name: campaignTitle.trim(),
          description: campaignDescription.trim() || null,
          channel: type,
          content,
          scheduledAt: scheduledDateTime.toISOString(),
        };

        const createResponse = await fetch("/api/v1/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(campaignPayload),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || "Failed to create campaign");
        }

        const newCampaign = await createResponse.json();

        // Set audience
        const audiencePayload = {
          audiences: [
            {
              sourceType: selectedSegmentId ? "segment" : "group",
              sourceId: selectedSegmentId || selectedGroupId,
            },
          ],
        };

        const audienceResponse = await fetch(
          `/api/v1/campaigns/${newCampaign.id}/audience`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(audiencePayload),
          }
        );

        if (!audienceResponse.ok) {
          throw new Error("Failed to set audience");
        }

        toast.success(
          `New campaign scheduled for ${format(scheduledDate, "PPP")} at ${scheduledTime}`
        );
      } else {
        // Update existing draft
        const updatePayload = {
          name: campaignTitle.trim(),
          description: campaignDescription.trim() || null,
          content,
          scheduledAt: scheduledDateTime.toISOString(),
        };

        const updateResponse = await fetch(`/api/v1/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || "Failed to update campaign");
        }

        // Update audience
        const audiencePayload = {
          audiences: [
            {
              sourceType: selectedSegmentId ? "segment" : "group",
              sourceId: selectedSegmentId || selectedGroupId,
            },
          ],
        };

        const audienceResponse = await fetch(
          `/api/v1/campaigns/${campaignId}/audience`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(audiencePayload),
          }
        );

        if (!audienceResponse.ok) {
          throw new Error("Failed to set audience");
        }

        toast.success(
          `Campaign scheduled for ${format(scheduledDate, "PPP")} at ${scheduledTime}`
        );
      }

      setIsScheduleOpen(false);
      router.push("/campaigns");
    } catch (error) {
      console.error("[Edit Campaign] Error scheduling:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to schedule campaign: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async () => {
    console.log("[Edit Campaign] Starting launch...");

    // Validate content
    if (type === "email") {
      if (!emailContent.subject.trim()) {
        toast.error("Please enter an email subject");
        return;
      }
      if (!emailContent.body.trim()) {
        toast.error("Please enter email content");
        return;
      }
    } else if (type === "sms") {
      if (!smsContent.text.trim()) {
        toast.error("Please enter SMS message");
        return;
      }
      if (smsContent.text.length > 1600) {
        toast.error("SMS message exceeds 1600 character limit");
        return;
      }
    }

    // Validate audience
    if (!selectedSegmentId && !selectedGroupId) {
      toast.error("Please select a target audience (segment or group)");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare content
      let content;
      if (type === "email") {
        content = {
          subject: emailContent.subject.trim(),
          html: emailContent.body,
          fontFamily: emailContent.fontFamily,
          fontWeights: emailContent.fontWeights,
        };
      } else {
        content = {
          text: smsContent.text.trim(),
          senderId: smsContent.senderId,
        };
      }

      let campaignIdToLaunch = campaignId;

      // If failed campaign, create new one
      if (isFailedCampaign) {
        const campaignPayload = {
          name: campaignTitle.trim(),
          description: campaignDescription.trim() || null,
          channel: type,
          content,
        };

        const createResponse = await fetch("/api/v1/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(campaignPayload),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || "Failed to create campaign");
        }

        const newCampaign = await createResponse.json();
        campaignIdToLaunch = newCampaign.id;
      } else {
        // Update existing draft
        const updatePayload = {
          name: campaignTitle.trim(),
          description: campaignDescription.trim() || null,
          content,
        };

        const updateResponse = await fetch(`/api/v1/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || "Failed to update campaign");
        }
      }

      // Set audience
      const audiencePayload = {
        audiences: [
          {
            sourceType: selectedSegmentId ? "segment" : "group",
            sourceId: selectedSegmentId || selectedGroupId,
          },
        ],
      };

      const audienceResponse = await fetch(
        `/api/v1/campaigns/${campaignIdToLaunch}/audience`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(audiencePayload),
        }
      );

      if (!audienceResponse.ok) {
        throw new Error("Failed to set audience");
      }

      // Launch campaign
      const launchResponse = await fetch(
        `/api/v1/campaigns/${campaignIdToLaunch}/launch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!launchResponse.ok) {
        const errorData = await launchResponse.json();
        throw new Error(errorData.error || "Failed to launch campaign");
      }

      toast.success("Campaign launched successfully");
      router.push("/campaigns");
    } catch (error) {
      console.error("[Edit Campaign] Error launching:", error);
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
            {isFailedCampaign && (
              <p className="text-sm text-amber-600">
                This campaign failed. Launching will create a new campaign with
                the same content.
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            className="text-muted-foreground shrink-0 self-start text-lg font-light"
            onClick={handleSaveDraft}
            disabled={isLoading || isFailedCampaign}
          >
            {isFailedCampaign ? "cannot save failed" : "save as draft"}
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
                    className="h-11 rounded-none border-r px-5"
                    disabled={isLoading}
                  >
                    <CalendarDaysIcon className="h-4 w-4" />
                    Schedule
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
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleSchedule}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          SCHEDULING...
                        </>
                      ) : (
                        "Schedule Campaign"
                      )}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                className="h-11 rounded-none px-6"
                onClick={handleLaunch}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    LAUNCHING...
                  </>
                ) : (
                  "Launch"
                )}
              </Button>
            </div>
          </div>

          {/* Feature Cards */}
          <Separator />
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
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  iconColor,
}: {
  icon: React.ReactNode;
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
