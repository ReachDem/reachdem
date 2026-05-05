import { Skeleton } from "@/components/ui/skeleton";

// ─── Contacts Table Skeleton ──────────────────────────────────────────────────
// Mimics the toolbar + table rows layout used by ContactsTable / GroupPanel.

export function ContactsTableSkeleton({
  rows = 6,
  showToolbar = true,
  compact = false,
}: {
  rows?: number;
  showToolbar?: boolean;
  compact?: boolean;
} = {}) {
  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
      {/* Toolbar skeleton */}
      {showToolbar && (
        <div className="flex items-center justify-between gap-4 px-4 pb-4 lg:px-6">
          <div className="flex flex-1 items-center gap-2">
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="hidden h-5 w-14 rounded-full sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      )}

      {/* Table skeleton */}
      <div className={compact ? "" : "px-4 lg:px-6"}>
        <div className="overflow-hidden rounded-lg border">
          {/* Header */}
          <div className="bg-muted flex h-10 items-center gap-4 border-b px-4">
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-14" />
          </div>

          {/* Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 border-b px-4 last:border-b-0 ${compact ? "h-10" : "h-14"}`}
            >
              <Skeleton className="size-4 rounded-sm" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <Skeleton className="ml-auto h-3 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between px-4">
        <Skeleton className="hidden h-4 w-32 lg:block" />
        <div className="ml-auto flex items-center gap-4">
          <Skeleton className="hidden h-4 w-24 lg:block" />
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Groups Page Skeleton ─────────────────────────────────────────────────────
// Left sidebar list + right panel placeholder.

export function GroupsPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="flex w-full flex-col md:w-72 md:shrink-0 lg:w-80">
          {/* Search */}
          <div className="px-3 pt-2 pb-2">
            <Skeleton className="h-8 w-full" />
          </div>

          {/* Group list */}
          <div className="mx-3 mb-3 h-[400px] overflow-hidden rounded-lg border md:h-[500px] lg:h-[600px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
              >
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel placeholder */}
        <div className="hidden flex-1 flex-col items-center justify-center pb-4 md:flex">
          <Skeleton className="size-8 rounded-lg opacity-30" />
          <Skeleton className="mt-3 h-4 w-48" />
        </div>
      </div>
    </div>
  );
}

// ─── Group Detail Skeleton ────────────────────────────────────────────────────
// Table skeleton for the group detail member list.

export function GroupDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pb-8 md:px-6">
        <ContactsTableSkeleton rows={5} compact />
      </div>
    </div>
  );
}
