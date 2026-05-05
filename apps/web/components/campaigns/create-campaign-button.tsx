"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewCampaignDialog } from "./new-campaign-dialog";

interface CreateCampaignButtonProps {
  variant?: "default" | "sidebar";
}

export function CreateCampaignButton({
  variant = "default",
}: CreateCampaignButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="gap-2"
        size={variant === "sidebar" ? "sm" : "default"}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {variant === "sidebar" ? "New" : "Create campaign"}
      </Button>
      <NewCampaignDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
