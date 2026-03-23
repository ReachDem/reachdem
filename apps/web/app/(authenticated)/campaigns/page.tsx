import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { getCampaigns } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignsClientTable } from "./campaigns-client-table";

export const metadata = {
  title: "Campaigns | ReachDem",
  description: "Manage your marketing campaigns.",
};

export default async function CampaignsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Create, manage, and launch your marketing campaigns.
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create campaign
          </Button>
        </Link>
      </div>

      <div className="bg-background rounded-lg border shadow-sm">
        <Suspense fallback={<TableSkeleton />}>
          <CampaignsLoader />
        </Suspense>
      </div>
    </div>
  );
}

async function CampaignsLoader() {
  const campaigns = await getCampaigns();
  return <CampaignsClientTable initialCampaigns={campaigns} />;
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
