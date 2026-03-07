"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SegmentNode } from "@reachdem/shared";
import {
  createSegment,
  updateSegment,
  evaluateSegmentContactsPreview,
  type Segment,
  type Contact,
} from "@/lib/api/segments";
import { useSegmentsStore } from "@/lib/stores/segments-store";

import { IconChevronLeft, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { QueryBuilder } from "./query-builder/query-builder";
import { PreviewPanel } from "./preview-panel";

// ─── Form Wrapper ─────────────────────────────────────────────────────────────

export type FieldOption = { key: string; label: string; type: string };

interface SegmentFormWrapperProps {
  mode: "create" | "edit";
  segment?: Segment;
  customFields?: FieldOption[];
}

const DEFAULT_DEFINITION: SegmentNode = {
  op: "AND",
  children: [],
};

export function SegmentFormWrapper({
  mode,
  segment,
  customFields = [],
}: SegmentFormWrapperProps) {
  const router = useRouter();

  // Local Form State
  const [name, setName] = React.useState(segment?.name || "");
  const [description, setDescription] = React.useState(
    segment?.description || ""
  );
  const [definition, setDefinition] = React.useState<SegmentNode>(
    segment?.definition || DEFAULT_DEFINITION
  );

  const [isPending, setIsPending] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Preview State
  const [previewContacts, setPreviewContacts] = React.useState<Contact[]>([]);
  const [previewTotal, setPreviewTotal] = React.useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [hasPreviewed, setHasPreviewed] = React.useState(false);

  // Global store to add/update after save
  const addSegment = useSegmentsStore((s) => s.addSegment);
  const refreshSegments = useSegmentsStore((s) => s.refreshSegments);

  // Track changes to warn user
  React.useEffect(() => {
    // A simple dirty check. In a real app with complex nested obj,
    // a deep equal or form library is better.
    const isDirty =
      name !== (segment?.name || "") ||
      description !== (segment?.description || "");
    // definition dirty check omitted for brevity in MVP, relies on explicit 'save' action
    setHasUnsavedChanges(isDirty);
  }, [name, description, segment]);

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await evaluateSegmentContactsPreview(definition, {
        limit: 20,
      });
      setPreviewContacts(res.items);
      setPreviewTotal(res.meta?.total ?? 0);
      setHasPreviewed(true);
    } catch (err: any) {
      setPreviewError(err.message || "Failed to load preview");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Automatically run preview on initial load if we are editing an existing segment
  React.useEffect(() => {
    if (mode === "edit") {
      handlePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevent accidental navigation
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Segment name is required");
      return;
    }

    // Basic validation: ensure root operator has at least one child if it's acting as a filter
    // (though a segment with no rules just matches everything, which might be valid depending on domain)
    // For MVP, we pass it down. The backend zod schema will validate `children.min(1)` if applicable.

    setIsPending(true);
    try {
      if (mode === "create") {
        const newSegment = await createSegment({
          name: name.trim(),
          description: description.trim() || undefined,
          definition,
        });
        addSegment(newSegment);
        toast.success(`Segment "${newSegment.name}" created!`);
        router.push("/contacts/segments");
      } else if (mode === "edit" && segment) {
        await updateSegment(segment.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          definition,
        });
        toast.success(`Segment updated successfully.`);
        // Refresh the list in the background
        refreshSegments();
        router.push("/contacts/segments");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred while saving.");
    } finally {
      setIsPending(false);
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (
        confirm("You have unsaved changes. Are you sure you want to leave?")
      ) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-2 md:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="text-muted-foreground h-8 w-8"
          >
            <IconChevronLeft className="size-5" />
          </Button>
          <div className="flex flex-col">
            <span className="text-sm leading-none font-medium">
              {mode === "create" ? "Create Segment" : "Edit Segment"}
            </span>
            {segment && (
              <span className="text-muted-foreground mt-1 text-xs">
                {segment.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || !name.trim()}
          >
            {isPending && <IconLoader2 className="mr-2 size-4 animate-spin" />}
            Save Segment
          </Button>
        </div>
      </header>

      {/* ── Split Layout ── */}
      {/* Mobile: Tabs (not fully implemented in MVP, just stacks). Desktop: Split. */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left Column: Form & Builder */}
        <div className="flex-1 overflow-y-auto border-r lg:w-3/5 lg:flex-none">
          <div className="shrink-0 p-4 md:p-8">
            {/* Metadata Section */}
            <div className="mb-8 max-w-2xl">
              <div>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Segment Name (e.g. VIP Customers)"
                  className="placeholder:text-muted-foreground/50 h-auto border-none bg-transparent px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
                  autoFocus
                />
              </div>
              <div>
                <Textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Add a description (optional)"
                  className="text-muted-foreground min-h-[60px] resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            {/* Query Builder Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Filter Criteria</h3>
              </div>
              <div className="bg-card rounded-xl border p-1 shadow-sm">
                <QueryBuilder
                  value={definition}
                  onChange={(newDef) => {
                    setDefinition(newDef);
                    setHasUnsavedChanges(true);
                  }}
                  customFields={customFields}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handlePreview}
                  disabled={isPreviewLoading}
                  variant="secondary"
                  className="gap-2 shadow-sm"
                >
                  {isPreviewLoading ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    "Preview"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview */}
        <div className="bg-muted/10 flex w-full shrink-0 flex-col overflow-hidden lg:w-2/5">
          <PreviewPanel
            contacts={previewContacts}
            total={previewTotal}
            isLoading={isPreviewLoading}
            error={previewError}
            hasPreviewed={hasPreviewed}
          />
        </div>
      </div>
    </div>
  );
}
