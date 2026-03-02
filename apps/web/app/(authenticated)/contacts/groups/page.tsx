import { Suspense } from "react";
import { getGroups } from "@/app/actions/groups";
import { GroupsClient } from "@/components/groups-client";

export const metadata = { title: "Groups – ReachDem" };

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <GroupsClient initialGroups={groups as any} />
      </Suspense>
    </div>
  );
}
