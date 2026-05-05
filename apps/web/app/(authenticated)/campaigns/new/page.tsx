"use client";

import { useRouter } from "next/navigation";
import { Mail, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewCampaignPage() {
  const router = useRouter();

  function handleSelect(type: "email" | "sms") {
    router.push(`/campaigns/new/${type}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create a new campaign
        </h1>
        <p className="text-muted-foreground mt-2">
          Choose the type of campaign you want to create
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleSelect("email")}
          className={cn(
            "group hover:border-primary flex min-h-[200px] flex-col items-start justify-between rounded-lg border-2 p-6 text-left transition-all hover:shadow-md",
            "border-border bg-background hover:bg-primary/5"
          )}
        >
          <Mail className="text-muted-foreground group-hover:text-primary h-8 w-8" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Email</h3>
            <p className="text-muted-foreground text-sm">
              Reach out with rich content, images, and personalized messages
            </p>
          </div>
          <div className="text-muted-foreground text-xs">
            Best for detailed communications
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelect("sms")}
          className={cn(
            "group hover:border-primary flex min-h-[200px] flex-col items-start justify-between rounded-lg border-2 p-6 text-left transition-all hover:shadow-md",
            "border-border bg-background hover:bg-primary/5"
          )}
        >
          <MessageSquare className="text-muted-foreground group-hover:text-primary h-8 w-8" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">SMS</h3>
            <p className="text-muted-foreground text-sm">
              Direct messaging for quick, urgent communications
            </p>
          </div>
          <div className="text-muted-foreground text-xs">
            160 characters max, instant delivery
          </div>
        </button>
      </div>
    </div>
  );
}
