"use client";

import { notFound, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Sparkles, TestTube2, Calendar } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  EmailComposer,
  type EmailContent,
} from "@/components/campaigns/email-composer";
import {
  SmsComposer,
  type SmsContent,
} from "@/components/campaigns/sms-composer";
import { AudienceTargetSelector } from "@/components/campaigns/audience-target-selector";
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

  // Mock data - replace with actual API calls
  const mockSegments = [
    { id: "seg-1", name: "Active Users" },
    { id: "seg-2", name: "Premium Customers" },
    { id: "seg-3", name: "Trial Users" },
    { id: "seg-4", name: "Inactive Users" },
  ];

  const mockGroups = [
    { id: "grp-1", name: "Marketing Team" },
    { id: "grp-2", name: "Sales Team" },
    { id: "grp-3", name: "Support Team" },
    { id: "grp-4", name: "All Employees" },
  ];

  // Unwrap params
  useEffect(() => {
    params.then((p) => {
      if (p.type !== "email" && p.type !== "sms") {
        notFound();
      }
      setType(p.type);
    });
  }, [params]);

  if (!type) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement save draft logic
      toast.success("Draft saved successfully");
    } catch (error) {
      toast.error("Failed to save draft");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement schedule logic
      toast.success("Campaign scheduled successfully");
      router.push("/campaigns");
    } catch (error) {
      toast.error("Failed to schedule campaign");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async () => {
    // Validate content based on type
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
      if (smsContent.text.length > 160) {
        toast.error("SMS message exceeds 160 character limit");
        return;
      }
    }

    setIsLoading(true);
    try {
      // TODO: Implement launch logic
      toast.success("Campaign launched successfully");
      router.push("/campaigns");
    } catch (error) {
      toast.error("Failed to launch campaign");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-4">
          <h1 className="text-2xl font-semibold">
            Create {type === "email" ? "Email" : "SMS"} Campaign
          </h1>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-muted-foreground font-light"
              onClick={handleSaveDraft}
              disabled={isLoading}
            >
              save as draft
            </Button>
            <Button
              variant="secondary"
              onClick={handleSchedule}
              disabled={isLoading}
            >
              Schedule
            </Button>
            <Button onClick={handleLaunch} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  LAUNCHING...
                </>
              ) : (
                "Launch Now"
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-8 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Target Audience Selector */}
          <AudienceTargetSelector
            segments={mockSegments}
            groups={mockGroups}
            selectedSegmentId={selectedSegmentId}
            selectedGroupId={selectedGroupId}
            onSegmentChange={setSelectedSegmentId}
            onGroupChange={setSelectedGroupId}
            disabled={isLoading}
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

          {/* Feature Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Sparkles className="h-5 w-5" />}
              title="AI SUBJECT OPTIMIZER"
              description="Let AI analyze your copy to generate high-open-rate subject lines for your segment."
              iconColor="text-purple-500"
            />
            <FeatureCard
              icon={<TestTube2 className="h-5 w-5" />}
              title="A/B TESTING"
              description="Set up an alternate version of this email to see which content drives more conversions."
              iconColor="text-cyan-500"
            />
            <FeatureCard
              icon={<Calendar className="h-5 w-5" />}
              title="SMART SCHEDULING"
              description="Automatically send when your recipients are most likely to be in their inboxes."
              iconColor="text-blue-500"
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
    <div className="bg-muted/30 rounded-lg border p-6">
      <div className="space-y-3">
        <div
          className={cn(
            "bg-background flex h-10 w-10 items-center justify-center rounded-lg",
            iconColor
          )}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            {title}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
