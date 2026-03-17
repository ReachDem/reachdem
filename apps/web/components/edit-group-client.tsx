"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { IconArrowLeft, IconTrash, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GroupForm } from "@/components/group-form";
import { updateGroup, deleteGroup } from "@/lib/api/groups";

interface EditGroupClientProps {
  groupId: string;
  defaultValues: { name: string; description: string };
}

export function EditGroupClient({
  groupId,
  defaultValues,
}: EditGroupClientProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function handleSave(data: { name: string; description: string }) {
    setIsPending(true);
    setError(null);
    try {
      await updateGroup(groupId, data);
      toast.success("Group updated successfully.");
      router.push(`/contacts/groups/${groupId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update group";
      setError(msg);
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteGroup(groupId);
      toast.success("Group deleted.");
      router.push("/contacts/groups");
    } catch {
      toast.error("Failed to delete group. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href={`/contacts/groups/${groupId}`}>
              <IconArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Edit group</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Update the group name or description.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive gap-1.5"
          onClick={() => setDeleteOpen(true)}
        >
          <IconTrash className="size-4" />
          <span className="hidden sm:inline">Delete group</span>
        </Button>
      </div>

      <div className="max-w-lg px-4 pb-8 md:px-6">
        <GroupForm
          defaultValues={defaultValues}
          onSubmit={handleSave}
          onCancel={() => router.push(`/contacts/groups/${groupId}`)}
          submitLabel="Save changes"
          isPending={isPending}
          error={error}
        />
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              This group will be permanently deleted. Contacts will not be
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
