import { Suspense } from "react";
import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";

import { getCampaigns } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignsClientTable } from "./campaigns-client-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campaigns | ReachDem",
  description: "Manage your campaigns.",
};

export default async function CampaignsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Create, manage, and launch your campaigns.
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create campaign
          </Button>
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CampaignsLoader />
      </Suspense>
    </div>
  );
}

async function CampaignsLoader() {
  try {
    const campaigns = await getCampaigns();
    return <CampaignsClientTable initialCampaigns={campaigns} />;
  } catch (error) {
    return <ErrorState error={error} />;
  }
}

function ErrorState({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12">
      <div className="bg-destructive/10 text-destructive rounded-full p-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Failed to load campaigns</h3>
        <p className="text-muted-foreground mt-1 text-sm">{message}</p>
      </div>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4 py-2">
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="rounded-md border">
        <div className="bg-muted/50 h-12 border-b" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b p-4 last:border-0"
          >
            <Skeleton className="h-5 w-[20%]" />
            <Skeleton className="h-5 w-[15%]" />
            <Skeleton className="h-5 w-[15%]" />
            <Skeleton className="h-5 w-[20%]" />
            <Skeleton className="ml-auto h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
