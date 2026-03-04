import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getGroupById,
  getGroupContacts,
  getContactsForPicker,
} from "@/app/actions/groups";
import { GroupDetailClient } from "@/components/group-detail-client";

import { GroupDetailSkeleton } from "@/components/skeletons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const group = await getGroupById(id);
    return { title: `${group.name} – Groups – ReachDem` };
  } catch {
    return { title: "Group – ReachDem" };
  }
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let group;
  try {
    group = await getGroupById(id);
  } catch {
    notFound();
  }

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
