import { Suspense } from "react";
import { getContactFieldDefinitions } from "@/app/actions/segments";
import { SegmentFormWrapper } from "@/components/segments/segment-form-wrapper";

export const metadata = { title: "Create Segment – ReachDem" };

export default async function CreateSegmentPage() {
  const customFields = await getContactFieldDefinitions();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="text-muted-foreground animate-pulse p-8 text-center">
            Loading builder...
          </div>
        }
      >
        <SegmentFormWrapper mode="create" customFields={customFields} />
      </Suspense>
    </div>
  );
}
