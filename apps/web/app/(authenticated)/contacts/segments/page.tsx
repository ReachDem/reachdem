import { Suspense } from "react";
import { getSegments } from "@/app/actions/segments";
import { SegmentsClient } from "@/components/segments-client";

import { GroupsPageSkeleton } from "@/components/skeletons";

export const metadata = { title: "Segments – ReachDem" };

export default async function SegmentsPage() {
  const segments = await getSegments();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Suspense fallback={<GroupsPageSkeleton />}>
        <SegmentsClient initialSegments={segments as any} />
      </Suspense>
    </div>
  );
}
