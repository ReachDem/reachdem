import { Suspense } from "react";
import {
  getGroupById,
  getGroupContacts,
  getContactsForPicker,
} from "@/app/actions/groups";
import { GroupDetailClient } from "@/components/groups/group-detail-client";

import { GroupDetailSkeleton } from "@/components/shared/skeletons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const group = await getGroupById(id);
  if (!group) return { title: "Group – ReachDem" };
  return { title: `${group.name} – Groups – ReachDem` };
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [membersData, contactsData] = await Promise.all([
    getGroupContacts(id, { limit: 200 }),
    getContactsForPicker({ limit: 200 }),
  ]);

  return (
    <Suspense fallback={<GroupDetailSkeleton />}>
      <GroupDetailClient
        groupId={id}
        initialMembers={membersData.items as any}
        initialContacts={contactsData.items as any}
        totalMembers={membersData.meta.total}
        totalContacts={contactsData.meta.total}
      />
    </Suspense>
  );
}
