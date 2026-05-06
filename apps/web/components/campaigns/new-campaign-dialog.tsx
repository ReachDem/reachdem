"use client";

import { useRouter } from "next/navigation";
import { Mail, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCampaignDialog({
  open,
  onOpenChange,
}: NewCampaignDialogProps) {
  const router = useRouter();

  function handleSelect(type: "email" | "sms") {
    onOpenChange(false);
    router.push(`/campaigns/new/${type}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create a new campaign</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={() => handleSelect("email")}
            className={cn(
              "group flex min-h-[140px] flex-col items-start justify-between rounded-lg border-2 p-5 text-left transition-all",
              "border-border hover:border-primary hover:bg-primary/5 hover:shadow-md"
            )}
          >
            <Mail className="text-muted-foreground group-hover:text-primary h-6 w-6" />
            <div>
              <h3 className="text-sm font-semibold">Email</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Rich content, images, and personalized messages
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect("sms")}
            className={cn(
              "group flex min-h-[140px] flex-col items-start justify-between rounded-lg border-2 p-5 text-left transition-all",
              "border-border hover:border-primary hover:bg-primary/5 hover:shadow-md"
            )}
          >
            <MessageSquare className="text-muted-foreground group-hover:text-primary h-6 w-6" />
            <div>
              <h3 className="text-sm font-semibold">SMS</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Direct messaging, 160 chars, instant delivery
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
