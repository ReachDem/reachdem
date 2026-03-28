import { Skeleton } from "@/components/ui/skeleton";

export function CampaignFormSkeleton() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header Skeleton */}
      <header>
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-6 px-4 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <Skeleton className="h-10 w-32 shrink-0" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-8 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Audience Selector Skeleton */}
          <div className="bg-card rounded-lg border p-6">
            <div className="space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-3">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </div>
          </div>

          {/* Composer Skeleton */}
          <div className="bg-muted/30 rounded-lg border p-6">
            <div className="space-y-4">
              {/* Subject/Title */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Mode Selector */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>

              {/* Editor Content */}
              <div className="space-y-3">
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex justify-end">
            <div className="inline-flex overflow-hidden rounded-lg border">
              <Skeleton className="h-11 w-28 rounded-none" />
              <Skeleton className="h-11 w-24 rounded-none" />
            </div>
          </div>

          {/* Feature Cards Skeleton */}
          <div className="border-t pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted/30 rounded-lg border p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-5" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
