"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CampaignTypeSelector } from "@/components/campaigns/campaign-type-selector";
import { Button } from "@/components/ui/button";

export default function NewCampaignPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"email" | "sms" | null>(
    null
  );

  const handleContinue = () => {
    if (selectedType) {
      // Navigate to the campaign form with the selected type
      router.push(`/campaigns/new/${selectedType}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create a new campaign
        </h1>
        <p className="text-muted-foreground mt-2">
          Choose the type of campaign you want to create
        </p>
      </div>

      <div className="space-y-6">
        <CampaignTypeSelector value={selectedType} onChange={setSelectedType} />

        <div className="flex justify-end gap-3 pt-4">
          <Link href="/campaigns">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleContinue} disabled={!selectedType}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
