import Link from "next/link";
import { notFound } from "next/navigation";
import { IconPencil } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { getGroupById } from "@/app/actions/groups";

export default async function GroupDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;

  const group = await getGroupById(id);
  if (!group) notFound();

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center gap-3">
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

      {children}
    </>
  );
}
