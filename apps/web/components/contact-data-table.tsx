"use client";

/**
 * Shared contact table primitive — DRY core used by both:
 *  - ContactsTable (full contacts page, with import/add toolbar)
 *  - GroupPanel    (group detail panel, with remove-member toolbar)
 */

import * as React from "react";
import {
  IconMail,
  IconPhone,
  IconUser,
  IconDotsVertical,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

// ─── Shared contact row type ──────────────────────────────────────────────────
// Superset that works for both the full contacts page and the group member panel.
export interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  phoneE164: string | null;
  enterprise?: string | null;
  gender?: string | null;
  work?: string | null;
  customFields?: Record<string, unknown>;
  createdAt: Date | string;
}

// ─── Build columns ────────────────────────────────────────────────────────────
// Accepts an optional `renderActions` cell renderer so callers can inject
// context-specific actions (edit/delete for contacts, remove for members).
export function buildContactColumns<T extends ContactRow>(
  rows: T[],
  options: {
    renderActions?: (row: T) => React.ReactNode;
    showSelect?: boolean;
  } = {}
): ColumnDef<T>[] {
  const { renderActions, showSelect = true } = options;

  // Discover custom field keys from the dataset
  const customFieldKeys = new Set<string>();
  rows.forEach((r) => {
    if (r.customFields && typeof r.customFields === "object") {
      Object.keys(r.customFields).forEach((k) => customFieldKeys.add(k));
    }
  });

  const cols: ColumnDef<T>[] = [];

  if (showSelect) {
    cols.push({
      id: "select",
      header: ({ table }) => (
        <div className="-ml-2 flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="-ml-2 flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    });
  }

  cols.push(
    {
      accessorKey: "name",
      header: "Contact",
      cell: ({ row }) => {
        const c = row.original;
        const initials = c.name
          ? c.name
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
              <span className="font-medium">{c.name || "Unknown"}</span>
              {c.enterprise && (
                <span className="text-muted-foreground text-xs">
                  {c.enterprise}
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
        if (!email) return <span className="text-muted-foreground">—</span>;
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
        if (!phone) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1.5 text-sm tabular-nums">
            <IconPhone className="text-muted-foreground size-3.5" />
            <span>{phone}</span>
          </div>
        );
      },
    }
  );

  // Optional: gender / work (only if data has them)
  const hasGender = rows.some((r) => r.gender != null);
  const hasWork = rows.some((r) => r.work != null);

  if (hasGender) {
    cols.push({
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => {
        const g = row.getValue("gender") as string;
        if (!g || g === "UNKNOWN")
          return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm capitalize">{g.toLowerCase()}</span>;
      },
    });
  }

  if (hasWork) {
    cols.push({
      accessorKey: "work",
      header: "Work",
      cell: ({ row }) => {
        const w = (row.original as ContactRow).work;
        if (!w) return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm">{w}</span>;
      },
    });
  }

  // Custom fields
  Array.from(customFieldKeys).forEach((key) => {
    cols.push({
      id: `custom_${key}`,
      accessorFn: (row) => (row.customFields as Record<string, unknown>)?.[key],
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      cell: ({ getValue }) => {
        const val = getValue() as string;
        if (!val) return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm">{val}</span>;
      },
    });
  });

  // Created date
  cols.push({
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
  });

  // Actions column (caller can inject any renderer)
  if (renderActions) {
    cols.push({
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end pr-2">
          {renderActions(row.original)}
        </div>
      ),
    });
  } else {
    // Default empty actions placeholder (keeps layout consistent)
    cols.push({
      id: "actions",
      enableHiding: false,
      cell: () => (
        <div className="flex justify-end pr-2">
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      ),
    });
  }

  return cols;
}

// ─── Default column visibility ────────────────────────────────────────────────
export function defaultContactVisibility(
  columns: ColumnDef<ContactRow>[],
  maxColumns = 7
): VisibilityState {
  const alwaysVisible = [
    "select",
    "name",
    "email",
    "phoneE164",
    "createdAt",
    "actions",
  ];
  const visibility: VisibilityState = {};
  const dynamicSlots = maxColumns - alwaysVisible.length;
  let dynamicCount = 0;

  columns.forEach((col) => {
    const id = col.id || (col as { accessorKey?: string }).accessorKey;
    if (!id) return;
    if (alwaysVisible.includes(id)) {
      visibility[id] = true;
    } else if (dynamicCount < dynamicSlots) {
      visibility[id] = true;
      dynamicCount++;
    } else {
      visibility[id] = false;
    }
  });

  return visibility;
}

// ─── ContactDataTable ─────────────────────────────────────────────────────────
// Pure table renderer. Callers supply the table instance (from useReactTable)
// and any toolbar content via a render prop slot.

interface ContactDataTableProps<T extends ContactRow> {
  /** Pre-built table instance from useReactTable */
  table: ReturnType<typeof useReactTable<T>>;
  /** Total column count (for empty-state colSpan) */
  columnCount: number;
  /** Slot rendered above the table (searches, action buttons, etc.) */
  toolbar?: React.ReactNode;
  /** Slot rendered below the table (pagination, counts, etc.) */
  footer?: React.ReactNode;
  /** Custom empty state */
  emptyState?: React.ReactNode;
  /** Compact mode — reduces row padding, hides pagination */
  compact?: boolean;
}

export function ContactDataTable<T extends ContactRow>({
  table,
  columnCount,
  toolbar,
  footer,
  emptyState,
  compact = false,
}: ContactDataTableProps<T>) {
  return (
    <div className={`flex flex-col gap-4 ${compact ? "gap-2" : ""}`}>
      {toolbar && <div>{toolbar}</div>}

      <div className={compact ? "" : "px-4 lg:px-6"}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} colSpan={h.colSpan}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
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
                    className={compact ? "h-10" : ""}
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
                  <TableCell colSpan={columnCount} className="h-44 text-center">
                    {emptyState ?? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconUser className="text-muted-foreground size-8" />
                        <p className="text-muted-foreground">No contacts</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {footer && <div>{footer}</div>}
    </div>
  );
}

// ─── Standard pagination footer ───────────────────────────────────────────────
export function ContactTablePagination<T extends ContactRow>({
  table,
}: {
  table: ReturnType<typeof useReactTable<T>>;
}) {
  return (
    <div className="flex items-center justify-between px-2">
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
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger
              size="sm"
              className="w-20"
              id="contacts-rows-per-page"
            >
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50].map((n) => (
                <SelectItem key={n} value={`${n}`}>
                  {n}
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
            <span className="sr-only">First page</span>
            <IconChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8 bg-transparent"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Previous page</span>
            <IconChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8 bg-transparent"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Next page</span>
            <IconChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 bg-transparent lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Last page</span>
            <IconChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── useContactTableState ─────────────────────────────────────────────────────
// Shared table state hook so callers don't repeat boilerplate.
export function useContactTableState<T extends ContactRow>(
  data: T[],
  columns: ColumnDef<T>[],
  initialVisibility?: VisibilityState,
  pageSize = 10
) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialVisibility ?? {});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data,
    columns,
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

  return { table, globalFilter, setGlobalFilter };
}
