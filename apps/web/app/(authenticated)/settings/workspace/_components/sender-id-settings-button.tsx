"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SenderIdDialog } from "@/components/onboarding/sender-id-dialog";

type SenderIdSettingsButtonProps = {
  senderId: string | null;
  verificationStatus: "not_submitted" | "pending" | "verified" | "rejected";
};

export function SenderIdSettingsButton({
  senderId,
  verificationStatus,
}: SenderIdSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        {verificationStatus === "pending"
          ? senderId
            ? "Update Sender ID"
            : "Configure"
          : senderId
            ? "Request Change"
            : "Configure"}
      </Button>

      <SenderIdDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
