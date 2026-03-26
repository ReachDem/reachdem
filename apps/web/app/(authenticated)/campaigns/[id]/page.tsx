import { notFound } from "next/navigation";
import { getCampaignById } from "@/actions/campaigns";

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
    <div className="mx-auto w-full max-w-7xl flex-1 p-8">
      <div className="space-y-6">
        {/* Campaign Header */}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {campaign.name}
          </h1>
          {campaign.description && (
            <p className="text-muted-foreground mt-2">{campaign.description}</p>
          )}
        </div>

        {/* Campaign Details Placeholder */}
        <div className="bg-background rounded-lg border p-6 shadow-sm">
          <p className="text-muted-foreground">
            Campaign details and statistics will be implemented in subsequent
            tasks.
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-sm">
              <span className="font-medium">Channel:</span>{" "}
              {campaign.channel.toUpperCase()}
            </p>
            <p className="text-sm">
              <span className="font-medium">Status:</span> {campaign.status}
            </p>
            <p className="text-sm">
              <span className="font-medium">Created:</span>{" "}
              {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
            <p className="text-sm">
              <span className="font-medium">Updated:</span>{" "}
              {new Date(campaign.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
