import { getAudienceGroups, getAudienceSegments } from "@/actions/campaigns";
import { CampaignForm } from "@/components/campaign-form";

export const metadata = {
  title: "Create Campaign | ReachDem",
  description: "Create a new marketing campaign.",
};

export default async function NewCampaignPage() {
  // Fetch required data for the form in parallel
  const [groups, segments] = await Promise.all([
    getAudienceGroups(),
    getAudienceSegments(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 p-8">
      <CampaignForm groups={groups} segments={segments} />
    </div>
  );
}
