"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconSearch,
  IconPlus,
  IconUsers,
  IconPencil,
  IconTrash,
  IconLoader2,
  IconUserMinus,
  IconLayoutColumns,
  IconChevronDown,
} from "@tabler/icons-react";
import { ContactsTableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { type ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  type ContactRow,
  buildContactColumns,
  defaultContactVisibility,
  useContactTableState,
  ContactDataTable,
  ContactTablePagination,
} from "@/components/contact-data-table";
import {
  type Group,
  createGroup,
  deleteGroup,
  listGroupContacts,
  removeGroupMembers,
} from "@/lib/api/groups";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenu,
} from "./ui/dropdown-menu";

import { useGroupsStore } from "@/lib/stores/groups-store";

// ─── Group Panel (right column) ───────────────────────────────────────────────

function GroupPanel({ group }: { group: Group }) {
  const router = useRouter();
  const [members, setMembers] = React.useState<ContactRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [removing, setRemoving] = React.useState(false);

  // Fetch members when group changes
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGroupContacts(group.id, { limit: 200 })
      .then((res) => {
        if (!cancelled) {
          setMembers(res.items as ContactRow[]);
          setTotal(res.meta.total);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [group.id]);

  async function handleRemoveMember(contactId: string) {
    setRemoving(true);
    try {
      await removeGroupMembers(group.id, [contactId]);
      setMembers((prev) => prev.filter((m) => m.id !== contactId));
      setTotal((c) => c - 1);
      toast.success("Contact removed from group.");
    } catch {
      toast.error("Failed to remove contact.");
    } finally {
      setRemoving(false);
    }
  }

  // Build columns with a "Remove" action
  const columns = React.useMemo<ColumnDef<ContactRow>[]>(
    () =>
      buildContactColumns(members, {
        showSelect: false,
        renderActions: (row) => (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-7"
            disabled={removing}
            onClick={() => handleRemoveMember(row.id)}
            title="Remove from group"
          >
            <IconUserMinus className="size-3.5" />
          </Button>
        ),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, removing]
  );

  const initialVisibility = React.useMemo(
    () => defaultContactVisibility(columns as ColumnDef<ContactRow>[]),
    [columns]
  );

  const { table, globalFilter, setGlobalFilter } = useContactTableState(
    members,
    columns,
    initialVisibility,
    10,
    "group-members"
  );

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Panel header skeleton */}
        <div className="mb-4 flex items-start justify-between gap-4 px-6">
          <div className="min-w-0">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1.5 h-3.5 w-48" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <ContactsTableSkeleton rows={10} compact showToolbar={true} />
        </div>
      </div>
    );
  }

  const toolbar = (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="relative max-w-sm flex-1">
        <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search members..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Columns toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconLayoutColumns className="size-4" />
              <span className="hidden lg:inline">Columns</span>
              <IconChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide())
              .map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  className="text-sm capitalize"
                  checked={c.getIsVisible()}
                  onCheckedChange={(v) => c.toggleVisibility(!!v)}
                >
                  {c.id
                    .replace("custom_", "")
                    .replace(/([A-Z])/g, " $1")
                    .trim()}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
          onClick={() => router.push(`/contacts/groups/${group.id}`)}
        >
          <IconPencil className="size-4" />
          <span className="hidden sm:inline">Manage</span>
        </Button>
      </div>
    </div>
  );

  const footer = (
    <div className="pb-2">
      <ContactTablePagination table={table} />
    </div>
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Panel header */}
      <div className="flex items-start justify-between gap-4 px-6">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{group.name}</h2>
          {group.description && (
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              {group.description}
            </p>
          )}
        </div>
      </div>

      {/* Members table */}
      <div className="flex-1 overflow-y-auto px-5">
        <ContactDataTable
          table={table}
          columnCount={columns.length}
          toolbar={toolbar}
          footer={footer}
          isLoading={loading}
          compact
        />
      </div>
    </div>
  );
}

// ─── Main Groups Client ───────────────────────────────────────────────────────

interface GroupsClientProps {
  initialGroups: Group[];
}

export function GroupsClient({ initialGroups }: GroupsClientProps) {
  const router = useRouter();

  // ── Zustand store ──
  const storeGroups = useGroupsStore((s) => s.groups);
  // Use initialGroups on first render to avoid empty flash
  const groups = storeGroups.length > 0 ? storeGroups : initialGroups;
  const selectedGroupId = useGroupsStore((s) => s.selectedGroupId);
  const search = useGroupsStore((s) => s.search);
  const isLoading = useGroupsStore((s) => s.isLoading);
  const setGroups = useGroupsStore((s) => s.setGroups);
  const selectGroup = useGroupsStore((s) => s.selectGroup);
  const setSearch = useGroupsStore((s) => s.setSearch);
  const addGroup = useGroupsStore((s) => s.addGroup);
  const removeGroup = useGroupsStore((s) => s.removeGroup);
  const refreshGroups = useGroupsStore((s) => s.refreshGroups);

  // ── Local UI state (dialogs / loading) ──
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Group | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Hydrate store on mount to ensure global state is populated
  React.useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups, setGroups]);

  const selectedGroup = React.useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

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
      addGroup(group);
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create group"
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteGroup(deleteTarget.id);
      removeGroup(deleteTarget.id);
      toast.success(`Group "${deleteTarget.name}" deleted.`);
    } catch {
      toast.error("Failed to delete group. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ── Main layout ──
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 md:py-5">
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

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ── */}
        <div className="flex w-full flex-col md:w-72 md:shrink-0 lg:w-80">
          {/* Search */}
          <div className="px-3 pt-2 pb-2">
            <div className="relative">
              <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>

          {/* Scrollable group list */}
          <div className="mx-3 mb-3 h-[400px] overflow-hidden rounded-lg border md:h-[500px] lg:h-[600px]">
            <div className="h-full overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((group) => (
                  <GroupListItem
                    key={group.id}
                    group={group}
                    isSelected={group.id === selectedGroupId}
                    onSelect={(id) => {
                      if (window.innerWidth < 768) {
                        router.push(`/contacts/groups/${id}`);
                      } else {
                        selectGroup(id);
                      }
                    }}
                    onEdit={(id) => router.push(`/contacts/groups/${id}`)}
                    onDelete={(g) => setDeleteTarget(g)}
                  />
                ))
              ) : (
                <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                  No groups found.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="hidden flex-1 flex-col overflow-hidden md:flex">
          {selectedGroup ? (
            <GroupPanel key={selectedGroup.id} group={selectedGroup} />
          ) : (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 text-sm">
              <IconUsers className="size-8 opacity-20" />
              <p className="text-gray-400">Select a group to preview it</p>
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <CreateGroupDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setCreateError(null);
        }}
        onSubmit={handleCreate}
        isPending={isPending}
        error={createError}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
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
              {isDeleting && (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Group list item ──────────────────────────────────────────────────────────

function GroupListItem({
  group,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  group: Group;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (g: Group) => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(group.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(group.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase ${
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {group.name.charAt(0)}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-tight font-medium">
          {group.name}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {group.description && (
            <p className="text-muted-foreground truncate text-xs">
              {group.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions (hover or selected) */}
      {(hovered || isSelected) && (
        <div
          className="flex shrink-0 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Manage group"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(group.id);
            }}
          >
            <IconPencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-7"
            title="Delete group"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(group);
            }}
          >
            <IconTrash className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Create dialog ────────────────────────────────────────────────────────────

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
