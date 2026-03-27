import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCampaignById } from "@/actions/campaigns";
import { CampaignDetailsClient } from "./campaign-details-client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Campaign Details | ReachDem",
  description: "View campaign details and statistics.",
};

export default async function CampaignDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await getCampaignById(id);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 md:p-8">
      <Suspense fallback={<LoadingSkeleton />}>
        <CampaignDetailsClient campaign={campaign} />
      </Suspense>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
