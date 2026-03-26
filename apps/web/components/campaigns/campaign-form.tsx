"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CampaignTypeSelector } from "./campaign-type-selector";
import { SMSComposer } from "./sms-composer";
import { EmailComposer, type EmailContent } from "./email-composer";

// Form validation schema
const formSchema = z.object({
  name: z
    .string()
    .min(1, "Campaign name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  channel: z.enum(["sms", "email"], {
    required_error: "Please select a channel",
  }),
  smsContent: z.string().optional(),
  emailContent: z
    .object({
      subject: z.string(),
      body: z.string(),
      mode: z.enum(["rich", "html", "react-email"]),
    })
    .optional(),
  audienceGroups: z.array(z.string()),
  audienceSegments: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  channel: "sms" | "email";
  status: string;
  content: any;
  audienceGroups?: string[];
  audienceSegments?: string[];
}

interface CampaignFormProps {
  initialData?: Campaign | null;
  groups: { id: string; name: string }[];
  segments: { id: string; name: string }[];
  mode: "create" | "edit";
  initialChannel?: "email" | "sms";
}

export function CampaignForm({
  initialData,
  groups,
  segments,
  mode,
  initialChannel,
}: CampaignFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize form with default values
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      channel: initialData?.channel || initialChannel || "email",
      smsContent:
        initialData?.channel === "sms" ? initialData.content?.text || "" : "",
      emailContent:
        initialData?.channel === "email"
          ? {
              subject: initialData.content?.subject || "",
              body: initialData.content?.html || "",
              mode: "rich" as const,
            }
          : {
              subject: "",
              body: "",
              mode: "rich" as const,
            },
      audienceGroups: initialData?.audienceGroups || [],
      audienceSegments: initialData?.audienceSegments || [],
    },
  });

  const watchChannel = watch("channel");
  const watchSmsContent = watch("smsContent");
  const watchEmailContent = watch("emailContent");

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Prepare payload based on channel
      const payload = {
        name: values.name,
        description: values.description || null,
        channel: values.channel,
        content:
          values.channel === "sms"
            ? { text: values.smsContent || "", from: "" }
            : {
                subject: values.emailContent?.subject || "",
                html: values.emailContent?.body || "",
                from: "",
              },
        audienceGroups: values.audienceGroups,
        audienceSegments: values.audienceSegments,
      };

      // TODO: Call appropriate server action based on mode
      // if (mode === "edit" && initialData) {
      //   await updateCampaign(initialData.id, payload);
      //   toast.success("Campaign updated successfully");
      // } else {
      //   await createCampaign(payload);
      //   toast.success("Campaign created successfully");
      // }

      console.log("Form submitted:", payload);
      toast.success(
        mode === "edit"
          ? "Campaign updated successfully"
          : "Campaign created successfully"
      );

      setHasUnsavedChanges(false);
      router.push("/campaigns");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-5xl space-y-8 pb-16"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="hover:bg-muted h-8 w-8 shrink-0 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "edit" ? "Edit Campaign" : "Create Campaign"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {mode === "edit"
                ? `Editing "${initialData?.name}"`
                : "Set up your new marketing campaign"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/campaigns">
            <Button variant="outline" type="button" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-24">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Save changes" : "Create campaign"}
          </Button>
        </div>
      </div>

      {/* Section 1: General Details */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <h3 className="text-lg font-medium">General Details</h3>
          <p className="text-muted-foreground text-sm">
            Basic information to identify this campaign internally
          </p>
        </div>
        <Card className="md:col-span-2">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium">
                Campaign Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Summer Sale 2024"
                {...register("name")}
                className={
                  errors.name
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {errors.name && (
                <p className="text-destructive text-sm font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Optional notes about this campaign"
                {...register("description")}
                className="h-24 resize-none"
              />
              {errors.description && (
                <p className="text-destructive text-sm font-medium">
                  {errors.description.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Section 2: Channel & Content */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <h3 className="text-lg font-medium">Channel & Content</h3>
          <p className="text-muted-foreground text-sm">
            Choose your communication channel and compose your message
          </p>
        </div>
        <Card className="md:col-span-2">
          <CardContent className="space-y-6 p-6">
            {/* Channel Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Channel <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="channel"
                control={control}
                render={({ field }) => (
                  <CampaignTypeSelector
                    value={field.value}
                    onChange={field.onChange}
                    disabled={
                      mode === "edit" && initialData?.status !== "draft"
                    }
                  />
                )}
              />
              {errors.channel && (
                <p className="text-destructive text-sm font-medium">
                  {errors.channel.message}
                </p>
              )}
            </div>

            {/* Content Composer */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Message Content <span className="text-destructive">*</span>
              </Label>

              {watchChannel === "sms" && (
                <Controller
                  name="smsContent"
                  control={control}
                  render={({ field }) => (
                    <SMSComposer
                      value={field.value || ""}
                      onChange={field.onChange}
                      disabled={
                        mode === "edit" && initialData?.status !== "draft"
                      }
                    />
                  )}
                />
              )}

              {watchChannel === "email" && (
                <Controller
                  name="emailContent"
                  control={control}
                  render={({ field }) => (
                    <EmailComposer
                      value={
                        field.value || { subject: "", body: "", mode: "rich" }
                      }
                      onChange={field.onChange}
                      disabled={
                        mode === "edit" && initialData?.status !== "draft"
                      }
                    />
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Section 3: Target Audience */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <h3 className="text-lg font-medium">Target Audience</h3>
          <p className="text-muted-foreground text-sm">
            Select the groups or segments that will receive this campaign
          </p>
        </div>
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">
              Audience selector will be implemented in the next task
            </p>
            {/* TODO: Implement AudienceSelector component in task 6.1 */}
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link href="/campaigns">
          <Button variant="outline" type="button" disabled={isSubmitting}>
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting} className="min-w-32">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "edit" ? "Save changes" : "Create campaign"}
        </Button>
      </div>
    </form>
  );
}
