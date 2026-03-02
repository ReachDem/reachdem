import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconPencil, IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  getGroupById,
  getGroupContacts,
  getContactsForPicker,
} from "@/app/actions/groups";
import { GroupDetailClient } from "@/components/group-detail-client";

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
    <div className="flex flex-1 flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/contacts/groups">
              <IconArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-muted-foreground mt-0.5 text-sm">
                {group.description}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link href={`/contacts/groups/${id}/edit`}>
            <IconPencil className="size-4" />
            <span className="hidden sm:inline">Edit group</span>
          </Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <GroupDetailClient
          groupId={id}
          initialMembers={membersData.items as any}
          initialContacts={contactsData.items as any}
          totalMembers={membersData.meta.total}
          totalContacts={contactsData.meta.total}
        />
      </Suspense>
    </div>
  );
}
