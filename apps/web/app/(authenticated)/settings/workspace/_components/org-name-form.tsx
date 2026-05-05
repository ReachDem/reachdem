"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOrganizationName } from "../_actions/update-org-name";

export function OrgNameForm({
  orgId,
  initialName,
}: {
  orgId: string;
  initialName: string;
}) {
  const [name, setName] = React.useState(initialName);
  const [isPending, setIsPending] = React.useState(false);
  const isDirty = name.trim() !== initialName;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || !isDirty) return;
    setIsPending(true);
    try {
      const result = await updateOrganizationName(orgId, trimmed);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Organization name updated.");
      }
    } catch {
      toast.error("Failed to update name. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Organization Name"
        disabled={isPending}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
      />
      <Button
        variant="outline"
        className="shrink-0"
        disabled={!isDirty || isPending || !name.trim()}
        onClick={handleSave}
      >
        {isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
