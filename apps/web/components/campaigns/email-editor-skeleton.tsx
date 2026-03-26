import { Skeleton } from "@/components/ui/skeleton";

export function EmailEditorSkeleton() {
  return (
    <div className="w-full space-y-4 rounded-lg">
      {/* Toolbar Skeleton */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-8 w-8" />
        ))}
      </div>

      {/* Editor Content Skeleton */}
      <div className="mx-auto max-w-[calc(600px+80px)] space-y-4 px-10">
        {/* Simulated content blocks */}
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />

        <div className="py-4">
          <Skeleton className="h-48 w-full" />
        </div>

        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />

        <div className="py-2">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}
