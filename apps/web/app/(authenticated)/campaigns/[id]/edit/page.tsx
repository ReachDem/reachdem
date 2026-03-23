import { notFound } from "next/navigation";
import {
  getAudienceGroups,
  getAudienceSegments,
  getCampaignById,
} from "@/actions/campaigns";
import { CampaignForm } from "@/components/campaign-form";

export const metadata = {
  title: "Edit Campaign | ReachDem",
  description: "Edit your marketing campaign.",
};

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch campaign and audience mappings
  const [campaign, groups, segments] = await Promise.all([
    getCampaignById(id),
    getAudienceGroups(),
    getAudienceSegments(),
  ]);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 p-8">
      <CampaignForm
        initialData={campaign}
        groups={groups}
        segments={segments}
      />
    </div>
  );
}
