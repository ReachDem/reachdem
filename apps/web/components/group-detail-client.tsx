"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconSearch,
  IconUserMinus,
  IconUserPlus,
  IconLoader2,
  IconCheck,
  IconUsers,
  IconPencil,
} from "@tabler/icons-react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type ContactRow,
  buildContactColumns,
  defaultContactVisibility,
  useContactTableState,
  ContactDataTable,
  ContactTablePagination,
} from "@/components/contact-data-table";

import {
  type Contact,
  removeGroupMembers,
  addGroupMembers,
} from "@/lib/api/groups";

import { useGroupDetailStore } from "@/lib/stores/group-detail-store";

// ─── Members Panel (Main Column) ──────────────────────────────────────────────

function GroupMembersPanel({
  groupId,
  initialMembers,
}: {
  groupId: string;
  initialMembers: Contact[];
}) {
  const storeMembers = useGroupDetailStore((s) => s.members);
  const members = storeMembers.length > 0 ? storeMembers : initialMembers;
  const memberCount = useGroupDetailStore((s) => s.memberCount);
  const isAddModalOpen = useGroupDetailStore((s) => s.isAddModalOpen);
  const isLoadingMembers = useGroupDetailStore((s) => s.isLoadingMembers);
  const setIsAddModalOpen = useGroupDetailStore((s) => s.setIsAddModalOpen);
  const allContacts = useGroupDetailStore((s) => s.allContacts);
  const setMembers = useGroupDetailStore((s) => s.setMembers);
  const removeMembersFromStore = useGroupDetailStore((s) => s.removeMembers);
  const refreshMembers = useGroupDetailStore((s) => s.refreshMembers);
  const refreshContacts = useGroupDetailStore((s) => s.refreshContacts);

  const memberIds = React.useMemo(
    () => new Set(members.map((m) => m.id)),
    [members]
  );

  const [isRemoving, setIsRemoving] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<Contact | null>(null);

  // Remove a single contact
  async function handleRemoveSingle(contact: Contact) {
    setRemoveTarget(null);
    setIsRemoving(true);
    try {
      await removeGroupMembers(groupId, [contact.id]);
      removeMembersFromStore([contact.id]);
      refreshContacts();
      toast.success(`${contact.name} removed from the group.`);
    } catch {
      toast.error("Failed to remove contact. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  // Bulk remove
  async function handleBulkRemove(
    selectedIds: Set<string>,
    clearSelection: () => void
  ) {
    if (selectedIds.size === 0) return;
    setIsRemoving(true);
    try {
      await removeGroupMembers(groupId, [...selectedIds]);
      removeMembersFromStore([...selectedIds]);
      clearSelection();
      toast.success(`Removed ${selectedIds.size} members.`);
    } catch {
      toast.error("Failed to remove members. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  const handleMembersAdded = React.useCallback(async () => {
    await refreshMembers(groupId);
    setIsAddModalOpen(false);
  }, [groupId, refreshMembers, setIsAddModalOpen]);

  const columns = React.useMemo<ColumnDef<Contact>[]>(
    () =>
      buildContactColumns(members, {
        showSelect: true,
        renderActions: (row) => (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-7"
            onClick={() => setRemoveTarget(row)}
            disabled={isRemoving}
            title="Remove from group"
          >
            <IconUserMinus className="size-3.5" />
          </Button>
        ),
      }) as ColumnDef<Contact>[],
    [members, isRemoving]
  );

  const initialVisibility = React.useMemo(
    () => defaultContactVisibility(columns),
    [columns]
  );

  const { table, globalFilter, setGlobalFilter } = useContactTableState(
    members,
    columns,
    initialVisibility,
    10,
    "group-detail"
  );

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const toolbar = (
    <div className="flex justify-between gap-4 pt-2">
      <div className="flex items-center gap-2 px-1">
        <div className="relative max-w-sm flex-1">
          <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search members…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        {selectedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive shrink-0 gap-1.5"
            onClick={() =>
              handleBulkRemove(
                new Set(
                  table
                    .getFilteredSelectedRowModel()
                    .rows.map((r) => r.original.id)
                ),
                () => table.toggleAllRowsSelected(false)
              )
            }
            disabled={isRemoving}
          >
            {isRemoving ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconUserMinus className="size-4" />
            )}
            <span className="hidden sm:inline">Remove {selectedCount}</span>
          </Button>
        )}
      </div>
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <IconUserPlus className="size-4" />
            Add Contacts
          </Button>
        </DialogTrigger>

        <DialogContent className="flex max-h-[90dvh] w-full flex-col p-4 sm:max-w-4xl lg:max-w-5xl">
          <DialogHeader className="px-1">
            <DialogTitle>Add Contacts to Group</DialogTitle>
            <DialogDescription>
              Select contacts from your workspace to add to this group.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[300px] flex-1 overflow-auto overscroll-contain">
            <GroupContactPicker
              groupId={groupId}
              allContacts={allContacts}
              existingMemberIds={memberIds}
              onMembersAdded={handleMembersAdded}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const footer = <ContactTablePagination table={table} />;

  return (
    <div className="flex flex-col gap-3">
      <ContactDataTable
        table={table}
        columnCount={columns.length}
        toolbar={toolbar}
        footer={footer}
        isLoading={isLoadingMembers}
        compact
      />

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeTarget?.name}</strong> will be removed from this
              group. The contact itself will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeTarget && handleRemoveSingle(removeTarget)}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Picker Panel (Modal Content) ──────────────────────────────────────────────

interface GroupContactPickerProps {
  groupId: string;
  allContacts: Contact[];
  existingMemberIds: Set<string>;
  onMembersAdded: () => void;
  onCancel: () => void;
}

function GroupContactPicker({
  groupId,
  allContacts,
  existingMemberIds,
  onMembersAdded,
  onCancel,
}: GroupContactPickerProps) {
  const [isAdding, setIsAdding] = React.useState(false);
  const isLoadingContacts = useGroupDetailStore((s) => s.isLoadingContacts);

  // Custom columns for picker (hides actions, changes checkbox behaviour, adds status badge)
  const columns = React.useMemo<ColumnDef<Contact>[]>(() => {
    // Base columns (reusing the DRY builder, but we patch it below)
    const base = buildContactColumns(allContacts, {
      showSelect: false, // We'll build a custom select column to handle disabled states
      renderActions: () => null, // Hide actions
    });

    // Strip actions, gender, work, added to keep it lean for the picker
    const leanCols = base.filter(
      (c) =>
        c.id !== "actions" &&
        (c as any).accessorKey !== "gender" &&
        (c as any).accessorKey !== "work" &&
        (c as any).accessorKey !== "createdAt"
    );

    const cols: ColumnDef<Contact>[] = [
      {
        id: "select",
        header: ({ table }) => {
          // Only count selectable rows (not already members)
          const selectableRows = table
            .getRowModel()
            .rows.filter((r) => !existingMemberIds.has(r.original.id));
          const allSelected =
            selectableRows.length > 0 &&
            selectableRows.every((r) => r.getIsSelected());
          const someSelected = selectableRows.some((r) => r.getIsSelected());

          return (
            <div className="-ml-2 flex items-center justify-center">
              <Checkbox
                checked={allSelected || (someSelected && "indeterminate")}
                onCheckedChange={(v) => {
                  selectableRows.forEach((r) => r.toggleSelected(!!v));
                }}
                aria-label="Select all eligible"
                disabled={selectableRows.length === 0}
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const isMember = existingMemberIds.has(row.original.id);
          return (
            <div className="-ml-2 flex items-center justify-center">
              <Checkbox
                checked={isMember || row.getIsSelected()}
                onCheckedChange={(v) => !isMember && row.toggleSelected(!!v)}
                aria-label="Select row"
                disabled={isMember}
              />
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      ...(leanCols as ColumnDef<Contact>[]),
      {
        id: "status",
        header: "",
        cell: ({ row }) => {
          const isMember = existingMemberIds.has(row.original.id);
          if (!isMember) return null;
          return (
            <div className="flex justify-end pr-2">
              <Badge
                variant="secondary"
                className="gap-1 text-xs font-normal whitespace-nowrap"
              >
                <IconCheck className="size-3" />
                In Group
              </Badge>
            </div>
          );
        },
      },
    ];

    return cols;
  }, [allContacts, existingMemberIds]);

  const initialVisibility = React.useMemo(
    () => defaultContactVisibility(columns),
    [columns]
  );

  const { table, globalFilter, setGlobalFilter } = useContactTableState(
    allContacts,
    columns,
    initialVisibility,
    10,
    "group-picker"
  );

  const selectedCount = table
    .getFilteredSelectedRowModel()
    .rows.filter((r) => !existingMemberIds.has(r.original.id)).length;

  async function handleAdd() {
    if (selectedCount === 0) return;
    setIsAdding(true);
    const idsToAdd = table
      .getFilteredSelectedRowModel()
      .rows.filter((r) => !existingMemberIds.has(r.original.id))
      .map((r) => r.original.id);

    try {
      await addGroupMembers(groupId, idsToAdd);
      onMembersAdded();
      table.toggleAllRowsSelected(false);
      toast.success(`Added ${idsToAdd.length} contact(s) to the group.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add contacts";
      toast.error(msg);
    } finally {
      setIsAdding(false);
    }
  }

  const toolbar = (
    <div className="flex items-center gap-2 px-1">
      <div className="relative flex-1">
        <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search contacts…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-9 pl-8"
        />
      </div>
    </div>
  );

  const footer = <ContactTablePagination table={table} />;

  const isWorkspaceEmpty = allContacts.length === 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="min-h-[300px] flex-1 overflow-auto overscroll-contain">
        <ContactDataTable
          table={table}
          columnCount={columns.length}
          toolbar={toolbar}
          footer={footer}
          isLoading={isLoadingContacts}
          compact
        />
      </div>
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isAdding}>
          Cancel
        </Button>
        <Button
          disabled={selectedCount === 0 || isAdding}
          onClick={handleAdd}
          className="gap-1.5"
        >
          {isAdding && <IconLoader2 className="size-4 animate-spin" />}
          Validate {selectedCount > 0 ? `(${selectedCount})` : ""}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

interface GroupDetailClientProps {
  groupId: string;
  initialMembers: Contact[];
  initialContacts: Contact[];
  totalMembers: number;
  totalContacts: number;
}

export function GroupDetailClient({
  groupId,
  initialMembers,
  initialContacts,
  totalMembers,
}: GroupDetailClientProps) {
  const storeMembers = useGroupDetailStore((s) => s.members);
  const storeAllContacts = useGroupDetailStore((s) => s.allContacts);

  // Use initial data on first render to avoid flash
  const members = storeMembers.length > 0 ? storeMembers : initialMembers;
  const allContacts =
    storeAllContacts.length > 0 ? storeAllContacts : initialContacts;

  const setMembers = useGroupDetailStore((s) => s.setMembers);
  const setAllContacts = useGroupDetailStore((s) => s.setAllContacts);

  // Hydrate the store on mount
  React.useEffect(() => {
    setMembers(initialMembers, totalMembers);
    setAllContacts(initialContacts);
  }, [
    initialMembers,
    initialContacts,
    totalMembers,
    setMembers,
    setAllContacts,
  ]);

  return (
    <>
      {/* Main Layout */}
      <div className="px-4 pb-8 md:px-6">
        <section className="flex flex-col gap-3">
          <GroupMembersPanel groupId={groupId} initialMembers={members} />
        </section>
      </div>
    </>
  );
}
