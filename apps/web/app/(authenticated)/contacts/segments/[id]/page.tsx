import { Suspense } from "react";
import {
  getSegmentById,
  getContactFieldDefinitions,
} from "@/app/actions/segments";
import { SegmentFormWrapper } from "@/components/segments/segment-form-wrapper";
import { type Segment } from "@/lib/api/segments";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit Segment – ReachDem" };

export default async function EditSegmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [segment, customFields] = await Promise.all([
      getSegmentById(id),
      getContactFieldDefinitions(),
    ]);

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Suspense
          fallback={
            <div className="text-muted-foreground animate-pulse p-8 text-center">
              Loading builder...
            </div>
          }
        >
          <SegmentFormWrapper
            mode="edit"
            segment={segment as unknown as Segment}
            customFields={customFields}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
