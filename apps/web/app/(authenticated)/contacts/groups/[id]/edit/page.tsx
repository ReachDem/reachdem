import { notFound } from "next/navigation";
import { getGroupById } from "@/app/actions/groups";
import { EditGroupClient } from "@/components/edit-group-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const group = await getGroupById(id);
    return { title: `Edit ${group.name} – ReachDem` };
  } catch {
    return { title: "Edit Group – ReachDem" };
  }
}

export default async function EditGroupPage({
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
