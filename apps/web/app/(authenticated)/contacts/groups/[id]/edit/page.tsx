import { notFound } from "next/navigation";
import { getGroupById } from "@/app/actions/groups";
import { EditGroupClient } from "@/components/groups/edit-group-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const group = await getGroupById(id);
  if (!group) return { title: "Edit Group – ReachDem" };
  return { title: `Edit ${group.name} – ReachDem` };
}

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const group = await getGroupById(id);
  if (!group) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <EditGroupClient
        groupId={id}
        defaultValues={{
          name: group.name,
          description: group.description ?? "",
        }}
      />
    </div>
  );
}
