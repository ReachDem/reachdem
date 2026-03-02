"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface GroupFormProps {
  defaultValues?: { name?: string; description?: string };
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isPending?: boolean;
  error?: string | null;
}

export function GroupForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  isPending = false,
  error,
}: GroupFormProps) {
  const [name, setName] = React.useState(defaultValues?.name ?? "");
  const [description, setDescription] = React.useState(
    defaultValues?.description ?? ""
  );
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError("Group name is required.");
      return;
    }
    setValidationError(null);
    await onSubmit({ name: name.trim(), description: description.trim() });
  }

  const displayError = error ?? validationError;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="group-name"
          placeholder="e.g. VIP Customers"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-description">Description</Label>
        <Textarea
          id="group-description"
          placeholder="What's this group for? (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={3}
          className="resize-none"
        />
      </div>

      {displayError && (
        <p className="text-destructive text-sm">{displayError}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
