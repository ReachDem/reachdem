"use client";

import * as React from "react";
import {
  IconChevronDown,
  IconDotsVertical,
  IconEdit,
  IconLayoutColumns,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconUser,
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
import { Input } from "@/components/ui/input";
import { NumberTicker } from "@/components/ui/number-ticker";

import { ContactImportDialog } from "@/components/contact-import-dialog";
import { AddContactDrawer } from "@/components/add-contact-drawer";
import {
  type ContactRow,
  buildContactColumns,
  defaultContactVisibility,
  useContactTableState,
  ContactDataTable,
  ContactTablePagination,
} from "@/components/contact-data-table";

// Re-export the rich Contact type (superset of ContactRow) for backwards compat
export type { ContactRow as Contact };

export function ContactsTable({
  initialContacts = [],
}: {
  initialContacts?: ContactRow[];
}) {
  // Build columns with default actions dropdown
  const columns = React.useMemo<ColumnDef<ContactRow>[]>(
    () =>
      buildContactColumns(initialContacts, {
        showSelect: true,
        renderActions: () => (
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
              <DropdownMenuItem variant="destructive">
                <IconTrash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialContacts]
  );

  const initialVisibility = React.useMemo(
    () => defaultContactVisibility(columns as ColumnDef<ContactRow>[]),
    [columns]
  );

  const { table, globalFilter, setGlobalFilter } = useContactTableState(
    initialContacts,
    columns,
    initialVisibility,
    10
  );

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

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

  const footer = <ContactTablePagination table={table} />;

  const emptyState = (
    <div className="flex flex-col items-center justify-center gap-2">
      <IconUser className="text-muted-foreground size-8" />
      <p className="text-muted-foreground">It&apos;s a bit empty here</p>
      <p className="text-muted-foreground text-xs">
        Start building your audience by importing contacts or adding them
        manually.
      </p>
    </div>
  );

  return (
    <ContactDataTable
      table={table}
      columnCount={columns.length}
      toolbar={toolbar}
      footer={footer}
      emptyState={emptyState}
    />
  );
}
