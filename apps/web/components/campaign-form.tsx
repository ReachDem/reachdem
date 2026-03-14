"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Campaign, createCampaign, updateCampaign } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  channel: z.string().min(1, "Please select a channel"),
  content: z.string().min(1, "Campaign content is required"),
  audienceGroups: z.array(z.string()),
  audienceSegments: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

interface CampaignFormProps {
  initialData?: Campaign | null;
  groups: { id: string; name: string }[];
  segments: { id: string; name: string }[];
}

export function CampaignForm({
  initialData,
  groups,
  segments,
}: CampaignFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      channel: initialData?.channel || "",
      content: initialData?.content || "",
      audienceGroups: initialData?.audienceGroups || [],
      audienceSegments: initialData?.audienceSegments || [],
    },
  });

  const watchChannel = watch("channel");
  const watchGroups = watch("audienceGroups");
  const watchSegments = watch("audienceSegments");

  const toggleArrayItem = (
    field: "audienceGroups" | "audienceSegments",
    id: string
  ) => {
    const current = field === "audienceGroups" ? watchGroups : watchSegments;
    const updated = current.includes(id)
      ? current.filter((i) => i !== id)
      : [...current, id];
    setValue(field, updated, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        description: values.description || null,
      };
      if (isEditing && initialData) {
        await updateCampaign(initialData.id, payload);
        toast.success("Campaign updated successfully");
      } else {
        await createCampaign(payload);
        toast.success("Campaign created successfully");
      }
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
              {isEditing ? "Edit Campaign" : "Create Campaign"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isEditing
                ? `Editing "${initialData.name}"`
                : "Set up your new marketing campaign."}
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
            {isEditing ? "Save changes" : "Create campaign"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <h3 className="text-lg font-medium">General Details</h3>
          <p className="text-muted-foreground text-sm">
            Basic information to identify this campaign internally.
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
                placeholder="e.g. Summer Sale 2026"
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <h3 className="text-lg font-medium">Channel & Content</h3>
          <p className="text-muted-foreground text-sm">
            Define where and what this campaign will send to users.
          </p>
        </div>
        <Card className="md:col-span-2">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-3">
              <Label htmlFor="channel" className="text-sm font-medium">
                Channel <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchChannel}
                onValueChange={(val) =>
                  setValue("channel", val, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                disabled={isEditing && initialData.status !== "draft"}
              >
                <SelectTrigger
                  id="channel"
                  className={
                    errors.channel
                      ? "border-destructive focus:ring-destructive"
                      : "w-full sm:w-[240px]"
                  }
                >
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                </SelectContent>
              </Select>
              {errors.channel && (
                <p className="text-destructive text-sm font-medium">
                  {errors.channel.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="content" className="text-sm font-medium">
                  Message Content <span className="text-destructive">*</span>
                </Label>
                {watchChannel && (
                  <span className="text-muted-foreground bg-muted rounded-md px-2 py-1 text-xs font-semibold tracking-wider uppercase">
                    Previewing {watchChannel}
                  </span>
                )}
              </div>
              <Textarea
                id="content"
                placeholder="Write your campaign message here..."
                {...register("content")}
                disabled={isEditing && initialData.status !== "draft"}
                className={`min-h-[160px] resize-y font-mono text-sm shadow-inner transition-colors ${errors.content ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-emerald-500/20"}`}
              />
              {errors.content && (
                <p className="text-destructive text-sm font-medium">
                  {errors.content.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <h3 className="text-lg font-medium">Target Audience</h3>
          <p className="text-muted-foreground text-sm">
            Select the groups or segments that will receive this campaign.
          </p>
        </div>
        <Card className="md:col-span-2">
          <CardContent className="grid grid-cols-1 gap-8 p-6 sm:grid-cols-2">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Groups</Label>
              <div className="bg-muted/30 border-border/50 space-y-3 rounded-lg border p-4">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex flex-row items-center space-x-3"
                  >
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={watchGroups.includes(group.id)}
                      onCheckedChange={() =>
                        toggleArrayItem("audienceGroups", group.id)
                      }
                    />
                    <Label
                      htmlFor={`group-${group.id}`}
                      className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {group.name}
                    </Label>
                  </div>
                ))}
                {groups.length === 0 && (
                  <p className="text-muted-foreground text-sm italic">
                    No groups available.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Segments</Label>
              <div className="bg-muted/30 border-border/50 space-y-3 rounded-lg border p-4">
                {segments.map((segment) => (
                  <div
                    key={segment.id}
                    className="flex flex-row items-center space-x-3"
                  >
                    <Checkbox
                      id={`segment-${segment.id}`}
                      checked={watchSegments.includes(segment.id)}
                      onCheckedChange={() =>
                        toggleArrayItem("audienceSegments", segment.id)
                      }
                    />
                    <Label
                      htmlFor={`segment-${segment.id}`}
                      className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {segment.name}
                    </Label>
                  </div>
                ))}
                {segments.length === 0 && (
                  <p className="text-muted-foreground text-sm italic">
                    No segments available.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
