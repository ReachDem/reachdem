"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconSearch,
  IconPlus,
  IconUsers,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconExternalLink,
  IconLoader2,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  type Group,
  listGroups,
  createGroup,
  deleteGroup,
} from "@/lib/api/groups";

interface GroupsClientProps {
  initialGroups: Group[];
}

export function GroupsClient({ initialGroups }: GroupsClientProps) {
  const router = useRouter();

  const [groups, setGroups] = React.useState<Group[]>(initialGroups);
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Group | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Client-side filtering
  const filtered = React.useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
    );
  }, [groups, search]);

  async function handleCreate(data: { name: string; description: string }) {
    setIsPending(true);
    setCreateError(null);
    try {
      const group = await createGroup(data);
      toast.success(`Group "${group.name}" created!`);
      setCreateOpen(false);
      router.push(`/contacts/groups/${group.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create group";
      setCreateError(msg);
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteGroup(deleteTarget.id);
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      toast.success(`Group "${deleteTarget.name}" deleted.`);
    } catch {
      toast.error("Failed to delete group. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  // Refresh list from API after navigating back
  React.useEffect(() => {
    async function refresh() {
      try {
        const result = await listGroups({ limit: 100 });
        setGroups(result.items ?? []);
      } catch {
        // silently fail, use initial data
      }
    }
    refresh();
  }, []);

  if (groups.length === 0 && !search) {
    return (
      <div className="flex flex-1 flex-col">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 md:py-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Groups</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Organise your contacts into static lists for targeted outreach.
            </p>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-muted flex size-16 items-center justify-center rounded-2xl">
              <IconUsers className="text-muted-foreground size-8" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold">No groups yet</p>
              <p className="text-muted-foreground max-w-sm text-sm">
                Create your first group to segment your contacts and run
                targeted campaigns.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setCreateOpen(true)}
              className="mt-2 gap-2"
            >
              <IconPlus className="size-4" />
              Create my first group
            </Button>
          </div>
        </div>

        {/* Create Dialog */}
        <CreateGroupDialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setCreateError(null);
          }}
          onSubmit={handleCreate}
          isPending={isPending}
          error={createError}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Page header */}
      <div className="flex flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Groups</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Organize your contacts into static lists for targeted actions.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <IconPlus className="size-4" />
            <span className="hidden sm:inline">Create group</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search groups…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="px-4 md:px-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">
                  Description
                </TableHead>
                <TableHead className="w-24 text-center">Members</TableHead>
                <TableHead className="hidden w-36 sm:table-cell">
                  Updated
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-12 text-center text-sm"
                  >
                    No groups match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/contacts/groups/${group.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium">{group.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-xs truncate text-sm md:table-cell">
                      {group.description || (
                        <span className="italic opacity-50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-normal">
                        {group._count?.members ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      {formatDistanceToNow(new Date(group.updatedAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <IconDotsVertical className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/contacts/groups/${group.id}`)
                            }
                          >
                            <IconExternalLink className="mr-2 size-4" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/contacts/groups/${group.id}/edit`)
                            }
                          >
                            <IconPencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(group)}
                          >
                            <IconTrash className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <CreateGroupDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateError(null);
        }}
        onSubmit={handleCreate}
        isPending={isPending}
        error={createError}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              The group <strong>&quot;{deleteTarget?.name}&quot;</strong> will
              be permanently deleted. Contacts will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {isDeleting ? (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateGroupDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a group</DialogTitle>
          <DialogDescription>
            Give your group a name to start adding contacts to it.
          </DialogDescription>
        </DialogHeader>
        <GroupForm
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create group"
          isPending={isPending}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}
