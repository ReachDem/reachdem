import { Suspense } from "react";
import { getSegments } from "@/app/actions/segments";
import { SegmentsClient } from "@/components/segments-client";
import { type Segment } from "@/lib/api/segments";

import { GroupsPageSkeleton } from "@/components/skeletons";

export const metadata = { title: "Segments – ReachDem" };

export default async function SegmentsPage() {
  const segments = await getSegments();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Suspense fallback={<GroupsPageSkeleton />}>
        <SegmentsClient initialSegments={segments as unknown as Segment[]} />
      </Suspense>
    </div>
  );
}
