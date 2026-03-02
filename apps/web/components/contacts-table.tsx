"use client";

import * as React from "react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
  IconMail,
  IconPhone,
  IconPlus,
  IconSearch,
  IconUpload,
  IconUser,
  IconEdit,
  IconTrash,
  IconCopy,
} from "@tabler/icons-react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ContactImportDialog } from "@/components/contact-import-dialog";
import { AddContactDrawer } from "@/components/add-contact-drawer";
import { NumberTicker } from "@/components/ui/number-ticker";

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phoneE164: string | null;
  gender: string | null;
  enterprise: string | null;
  work: string | null;
  customFields?: any;
  createdAt: Date;
}

export function ContactsTable({
  initialContacts = [],
}: {
  initialContacts?: Contact[];
}) {
  const dynamicColumns = React.useMemo<ColumnDef<Contact>[]>(() => {
    // Determine dynamic custom fields present in the data
    const customFieldKeys = new Set<string>();
    initialContacts.forEach((contact) => {
      if (contact.customFields && typeof contact.customFields === "object") {
        Object.keys(contact.customFields).forEach((key) =>
          customFieldKeys.add(key)
        );
      }
    });

    const baseCols: ColumnDef<Contact>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <div className="-ml-2 flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="-ml-2 flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: "Contact",
        cell: ({ row }) => {
          const contact = row.original;
          const initials = contact.name
            ? contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : "??";

          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{contact.name || "Unknown"}</span>
                {contact.enterprise && (
                  <span className="text-muted-foreground text-xs">
                    {contact.enterprise}
                  </span>
                )}
              </div>
            </div>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.original.email;
          if (!email) return <span className="text-muted-foreground">--</span>;
          return (
            <div className="flex items-center gap-1.5 text-sm">
              <IconMail className="text-muted-foreground size-3.5" />
              <span>{email}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "phoneE164",
        header: "Phone",
        cell: ({ row }) => {
          const phone = row.getValue("phoneE164") as string;
          if (!phone) return <span className="text-muted-foreground">--</span>;
          return (
            <div className="flex items-center gap-1.5 text-sm tabular-nums">
              <IconPhone className="text-muted-foreground size-3.5" />
              <span>{phone}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "gender",
        header: "Gender",
        cell: ({ row }) => {
          const g = row.getValue("gender") as string;
          if (!g || g === "UNKNOWN")
            return <span className="text-muted-foreground">--</span>;
          return <span className="text-sm capitalize">{g.toLowerCase()}</span>;
        },
      },
      {
        accessorKey: "work",
        header: "Work",
        cell: ({ row }) => {
          const w = row.original.work;
          if (!w) return <span className="text-muted-foreground">--</span>;
          return <span className="text-sm">{w}</span>;
        },
      },
    ];

    // Add dynamic custom fields
    Array.from(customFieldKeys).forEach((key) => {
      baseCols.push({
        id: `custom_${key}`,
        accessorFn: (row) => (row.customFields as any)?.[key],
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        cell: ({ getValue }) => {
          const val = getValue() as string;
          if (!val) return <span className="text-muted-foreground">--</span>;
          return <span className="text-sm">{val}</span>;
        },
      });
    });

    // Add final trailing columns
    baseCols.push(
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: ({ row }) => {
          const date = new Date(row.getValue("createdAt") as Date);
          return (
            <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end pr-2">
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
          </div>
        ),
      }
    );

    return baseCols;
  }, [initialContacts]);

  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => {
      // Only show up to 7 columns by default to avoid crowding
      const defaultVisible = [
        "select",
        "name",
        "email",
        "phoneE164",
        "createdAt",
        "actions",
      ];
      const visibility: VisibilityState = {};

      // Default hiding strategy for others if they exceed remaining count
      const maxVisibleDynamic = 7 - defaultVisible.length; // usually 1 or 2 slots left
      let visibleDynamicCount = 0;

      dynamicColumns.forEach((col) => {
        const colId = col.id || (col as any).accessorKey;
        if (!colId) return;

        if (defaultVisible.includes(colId)) {
          visibility[colId] = true;
        } else {
          if (visibleDynamicCount < maxVisibleDynamic) {
            visibility[colId] = true;
            visibleDynamicCount++;
          } else {
            visibility[colId] = false;
          }
        }
      });

      return visibility;
    });
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: initialContacts,
    columns: dynamicColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
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
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="text-sm capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id
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

      {/* Table */}
      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={dynamicColumns.length}
                    className="h-44 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <IconUser className="text-muted-foreground size-8" />
                      <p className="text-muted-foreground">
                        It's a bit empty here
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Start building your audience by importing contacts or
                        adding them manually.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {table.getFilteredRowModel().rows.length} contact(s) total
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label
              htmlFor="contacts-rows-per-page"
              className="text-sm font-medium"
            >
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger
                size="sm"
                className="w-20"
                id="contacts-rows-per-page"
              >
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 bg-transparent p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8 bg-transparent"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8 bg-transparent"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 bg-transparent lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
