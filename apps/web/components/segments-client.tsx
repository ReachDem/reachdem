"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconSearch,
  IconPlus,
  IconFilter,
  IconPencil,
  IconTrash,
  IconCopy,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { type Segment, deleteSegment } from "@/lib/api/segments";

import { useSegmentsStore } from "@/lib/stores/segments-store";

// ─── Main Segments Client ───────────────────────────────────────────────────────

interface SegmentsClientProps {
  initialSegments: Segment[];
}

export function SegmentsClient({ initialSegments = [] }: SegmentsClientProps) {
  const router = useRouter();

  // ── Zustand store ──
  const storeSegments = useSegmentsStore((s) => s.segments);
  const segments =
    storeSegments.length > 0 ? storeSegments : initialSegments || [];
  const search = useSegmentsStore((s) => s.search);
  const setSearch = useSegmentsStore((s) => s.setSearch);
  const setSegments = useSegmentsStore((s) => s.setSegments);
  const removeSegment = useSegmentsStore((s) => s.removeSegment);

  // ── Local UI state (dialogs / loading) ──
  const [deleteTarget, setDeleteTarget] = React.useState<Segment | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Hydrate store on mount to ensure global state is populated
  React.useEffect(() => {
    setSegments(initialSegments);
  }, [initialSegments, setSegments]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return segments;
    const q = search.toLowerCase();
    return segments.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [segments, search]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSegment(deleteTarget.id);
      removeSegment(deleteTarget.id);
      toast.success(`Segment "${deleteTarget.name}" deleted.`);
    } catch {
      toast.error("Failed to delete segment. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ── Main layout ──
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 border-b px-4 py-4 md:px-6 md:py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Segments</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Dynamic audience groups automatically updated by filters.
          </p>
        </div>
        <Button
          onClick={() => router.push("/contacts/segments/create")}
          className="gap-2"
        >
          <IconPlus className="size-4" />
          <span className="hidden sm:inline">Create segment</span>
        </Button>
      </div>

      {/* Body */}
      <div className="bg-muted/10 flex flex-1 flex-col overflow-hidden">
        {/* Search Toolbar */}
        <div className="px-4 py-4 md:px-6">
          <div className="relative max-w-md">
            <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search segments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background h-10 pl-9"
            />
          </div>
        </div>

        {/* Scrollable list grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.length > 0 ? (
              filtered.map((segment) => (
                <SegmentCard
                  key={segment.id}
                  segment={segment}
                  onEdit={(id) => router.push(`/contacts/segments/${id}`)}
                  onDelete={(s) => setDeleteTarget(s)}
                />
              ))
            ) : (
              <div className="bg-background col-span-full rounded-xl border-2 border-dashed py-12 text-center">
                <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
                  <IconFilter className="text-muted-foreground size-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  No segments found
                </h3>
                <p className="text-muted-foreground mx-auto mt-2 mb-4 max-w-sm text-sm">
                  Create dynamic groups based on rules to engage with your
                  contacts more effectively.
                </p>
                <Button
                  onClick={() => router.push("/contacts/segments/create")}
                  variant="outline"
                  className="gap-2"
                >
                  <IconPlus className="size-4" />
                  Create segment
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete segment?</AlertDialogTitle>
            <AlertDialogDescription>
              The segment <strong>&quot;{deleteTarget?.name}&quot;</strong> will
              be permanently deleted. Your actual contacts will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Segment Card Item ──────────────────────────────────────────────────────────

function SegmentCard({
  segment,
  onEdit,
  onDelete,
}: {
  segment: Segment;
  onEdit: (id: string) => void;
  onDelete: (s: Segment) => void;
}) {
  return (
    <div className="group bg-card relative flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all hover:shadow-md">
      <div>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
            <IconFilter className="size-5" />
          </div>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-8 h-8 w-8"
              title="Edit segment"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(segment.id);
              }}
            >
              <IconPencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-8 h-8 w-8"
              title="Delete segment"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(segment);
              }}
            >
              <IconTrash className="size-4" />
            </Button>
          </div>
        </div>

        <h3
          className="mb-1 line-clamp-1 leading-tight font-semibold"
          title={segment.name}
        >
          {segment.name}
        </h3>

        {segment.description ? (
          <p
            className="text-muted-foreground line-clamp-2 h-10 text-sm"
            title={segment.description}
          >
            {segment.description}
          </p>
        ) : (
          <p className="text-muted-foreground h-10 text-sm italic opacity-50">
            No description
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t pt-4">
        <span className="text-muted-foreground text-xs font-medium">
          Rule set
        </span>
        <span className="text-muted-foreground text-xs">
          {new Date(segment.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
