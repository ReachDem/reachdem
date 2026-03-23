"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconChevronDown,
  IconDotsVertical,
  IconEdit,
  IconLayoutColumns,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconCopy,
} from "@tabler/icons-react";
import { type ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { Input } from "@/components/ui/input";
import { NumberTicker } from "@/components/ui/number-ticker";

import { ContactImportDialog } from "@/components/contact-import-dialog";
import { AddContactDrawer } from "@/components/add-contact-drawer";
import { deleteContacts } from "@/app/actions/contacts";
import {
  type ContactRow,
  buildContactColumns,
  defaultContactVisibility,
  useContactTableState,
  ContactDataTable,
  ContactTablePagination,
} from "@/components/contact-data-table";
import { useContactsStore } from "@/lib/stores/contacts-store";

// Re-export the rich Contact type (superset of ContactRow) for backwards compat
export type { ContactRow as Contact };

export function ContactsTable({
  initialContacts,
}: {
  initialContacts?: ContactRow[];
}) {
  // Read contacts and loading state from the Zustand store
  const storeContacts = useContactsStore((s) => s.contacts);
  const hasHydrated = useContactsStore((s) => s.hasHydrated);
  const contacts = hasHydrated ? storeContacts : (initialContacts ?? []);
  const isLoading = useContactsStore((s) => s.isLoading);
  const removeContacts = useContactsStore((s) => s.removeContacts);
  const [deleteState, setDeleteState] = React.useState<{
    ids: string[];
    label: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");
  const requiredDeletePhrase = "delete these contacts";

  const openDeleteDialog = React.useCallback((ids: string[], label: string) => {
    if (ids.length === 0) return;
    setDeleteConfirmation("");
    setDeleteState({ ids, label });
  }, []);

  // Build columns with default actions dropdown

  const columns = React.useMemo<ColumnDef<ContactRow>[]>(
    () =>
      buildContactColumns(contacts, {
        showSelect: true,
        renderActions: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
              >
                <IconDotsVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>
                <IconEdit className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCopy className="mr-2 size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => openDeleteDialog([row.id], row.name)}
              >
                <IconTrash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contacts, openDeleteDialog]
  );

  const initialVisibility = React.useMemo(
    () => defaultContactVisibility(columns as ColumnDef<ContactRow>[]),
    [columns]
  );

  const { table, globalFilter, setGlobalFilter } = useContactTableState(
    contacts,
    columns,
    initialVisibility,
    10,
    "contacts"
  );

  const handleDeleteContacts = React.useCallback(async () => {
    if (!deleteState || isDeleting) return;

    setIsDeleting(true);
    try {
      const result = await deleteContacts(deleteState.ids);

      if (result.count === 0) {
        toast.error("No contacts were deleted.");
        return;
      }

      removeContacts(deleteState.ids);
      table.resetRowSelection();
      toast.success(
        result.count === 1
          ? "Contact deleted."
          : `${result.count} contacts deleted.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete contacts."
      );
    } finally {
      setIsDeleting(false);
      setDeleteState(null);
    }
  }, [deleteState, isDeleting, removeContacts, table]);

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const selectedIds = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original.id);

  const toolbar = (
    <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search contacts..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-9 pl-8"
          />
        </div>

        {selectedCount > 0 ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {selectedCount} selected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={isDeleting}
              onClick={() =>
                openDeleteDialog(
                  selectedIds,
                  selectedCount === 1
                    ? "this contact"
                    : `${selectedCount} selected contacts`
                )
              }
            >
              <IconTrash className="size-4" />
              <span className="hidden lg:inline">Delete</span>
            </Button>
          </div>
        ) : (
          <Badge
            variant="outline"
            className="text-muted-foreground pointer-events-none hidden font-light sm:inline-flex"
          >
            <NumberTicker
              value={table.getFilteredRowModel().rows.length}
              className="text-foreground text-sm font-light"
            />
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Columns toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconLayoutColumns />
              <span className="hidden lg:inline">Columns</span>
              <IconChevronDown />
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

        <ContactImportDialog>
          <Button variant="outline" size="sm">
            <IconUpload className="size-4" />
            <span className="hidden lg:inline">Import</span>
          </Button>
        </ContactImportDialog>

        <AddContactDrawer>
          <Button size="sm">
            <IconPlus className="size-4" />
            <span className="hidden lg:inline">Add Contact</span>
          </Button>
        </AddContactDrawer>
      </div>
    </div>
  );

  const footer = (
    <div className="px-2">
      <ContactTablePagination table={table} />
    </div>
  );

  return (
    <>
      <ContactDataTable
        table={table}
        columnCount={columns.length}
        toolbar={toolbar}
        footer={footer}
        isLoading={isLoading}
      />

      <AlertDialog
        open={!!deleteState}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteState(null);
            setDeleteConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Do you really want to delete
              {deleteState?.ids.length === 1
                ? " this contact?"
                : " these contacts?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteState?.ids.length === 1
                ? `This action is irreversible. It will permanently remove ${deleteState.label} from your contacts list.`
                : `This action is irreversible. It will permanently remove ${deleteState?.label} from your contacts list.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Type <span className="font-semibold">{requiredDeletePhrase}</span>{" "}
              to confirm.
            </p>
            <Input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder={requiredDeletePhrase}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setDeleteConfirmation("")}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContacts}
              disabled={
                isDeleting || deleteConfirmation.trim() !== requiredDeletePhrase
              }
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
