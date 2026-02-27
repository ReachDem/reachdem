"use client"

import * as React from "react"
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
} from "@tabler/icons-react"
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
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ContactImportDialog } from "@/components/contact-import-dialog"
import { AddContactDrawer } from "@/components/add-contact-drawer"

export interface Contact {
  id: number
  name: string
  email: string | null
  phone: string | null
  sexe: "male" | "female" | "other" | "unknown"
  enterprise: string | null
  work: string | null
  segments: string[]
  created_at: string
}

const columns: ColumnDef<Contact>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
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
      const contact = row.original
      const initials = contact.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{contact.name}</span>
            {contact.enterprise && (
              <span className="text-muted-foreground text-xs">{contact.enterprise}</span>
            )}
          </div>
        </div>
      )
    },
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.original.email
      if (!email) return <span className="text-muted-foreground">--</span>
      return (
        <div className="flex items-center gap-1.5 text-sm">
          <IconMail className="size-3.5 text-muted-foreground" />
          <span>{email}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.original.phone
      if (!phone) return <span className="text-muted-foreground">--</span>
      return (
        <div className="flex items-center gap-1.5 text-sm tabular-nums">
          <IconPhone className="size-3.5 text-muted-foreground" />
          <span>{phone}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "segments",
    header: "Segments",
    cell: ({ row }) => {
      const segments = row.original.segments
      if (!segments.length) return <span className="text-muted-foreground">--</span>
      return (
        <div className="flex items-center gap-1 flex-wrap">
          {segments.slice(0, 2).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs font-normal">
              {s}
            </Badge>
          ))}
          {segments.length > 2 && (
            <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
              +{segments.length - 2}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Added",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return (
        <span className="text-muted-foreground text-sm tabular-nums">
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon">
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>
            <IconEdit className="size-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconCopy className="size-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <IconTrash className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

// Mock data
const mockContacts: Contact[] = [
  { id: 1, name: "Amadou Diallo", email: "amadou@startup.sn", phone: "+221 77 123 4567", sexe: "male", enterprise: "TechDak", work: "CTO", segments: ["VIP", "Tech"], created_at: "2025-11-15" },
  { id: 2, name: "Fatou Sow", email: "fatou.sow@gmail.com", phone: "+221 78 234 5678", sexe: "female", enterprise: "Wave Africa", work: "Marketing Lead", segments: ["Newsletter"], created_at: "2025-11-12" },
  { id: 3, name: "Moussa Ndiaye", email: null, phone: "+221 76 345 6789", sexe: "male", enterprise: null, work: null, segments: ["SMS Only"], created_at: "2025-11-10" },
  { id: 4, name: "Aissatou Ba", email: "aissatou@wave.com", phone: "+221 77 456 7890", sexe: "female", enterprise: "Wave", work: "Product Manager", segments: ["VIP", "Fintech"], created_at: "2025-10-28" },
  { id: 5, name: "Ibrahima Fall", email: "ibrahima.fall@orange.sn", phone: "+221 78 567 8901", sexe: "male", enterprise: "Orange Sonatel", work: "Engineer", segments: ["Tech", "Enterprise"], created_at: "2025-10-25" },
  { id: 6, name: "Mariama Diop", email: "mariama@reachdem.com", phone: null, sexe: "female", enterprise: "ReachDem", work: "Designer", segments: ["Internal"], created_at: "2025-10-20" },
  { id: 7, name: "Ousmane Sarr", email: "ousmane.sarr@free.sn", phone: "+221 76 678 9012", sexe: "male", enterprise: "Free Senegal", work: "Sales Director", segments: ["Enterprise", "Telecom"], created_at: "2025-10-18" },
  { id: 8, name: "Khady Mbaye", email: "khady.m@gmail.com", phone: "+221 77 789 0123", sexe: "female", enterprise: null, work: "Freelance", segments: ["Newsletter", "Freelancers"], created_at: "2025-10-15" },
  { id: 9, name: "Cheikh Gueye", email: "cheikh@tpsgroup.sn", phone: "+221 78 890 1234", sexe: "male", enterprise: "TPS Group", work: "CEO", segments: ["VIP"], created_at: "2025-10-12" },
  { id: 10, name: "Ndeye Awa Dieng", email: "ndeye@expresso.sn", phone: "+221 70 901 2345", sexe: "female", enterprise: "Expresso", work: "HR Manager", segments: ["Enterprise"], created_at: "2025-10-08" },
  { id: 11, name: "Pape Diouf", email: null, phone: "+221 77 012 3456", sexe: "male", enterprise: null, work: null, segments: ["SMS Only", "Promo"], created_at: "2025-10-05" },
  { id: 12, name: "Rama Thiam", email: "rama.thiam@atos.sn", phone: "+221 78 123 4567", sexe: "female", enterprise: "Atos Senegal", work: "Consultant", segments: ["Tech", "Newsletter"], created_at: "2025-09-28" },
  { id: 13, name: "Babacar Cissé", email: "babacar@uba.sn", phone: "+221 76 234 5678", sexe: "male", enterprise: "UBA Senegal", work: "Branch Manager", segments: ["Fintech", "VIP"], created_at: "2025-09-25" },
  { id: 14, name: "Sokhna Diaw", email: "sokhna.d@gmail.com", phone: null, sexe: "female", enterprise: null, work: "Student", segments: ["Newsletter"], created_at: "2025-09-20" },
  { id: 15, name: "Abdoulaye Sy", email: "abdoulaye@sonatel.sn", phone: "+221 77 345 6789", sexe: "male", enterprise: "Sonatel", work: "Network Engineer", segments: ["Enterprise", "Tech", "Telecom"], created_at: "2025-09-15" },
]

export function ContactsTable() {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data: mockContacts,
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
  })

  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {selectedCount} selected
              </Badge>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <IconTrash className="size-4" />
                <span className="hidden lg:inline">Delete</span>
              </Button>
            </div>
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
                .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
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
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <IconUser className="size-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No contacts found</p>
                      <p className="text-muted-foreground text-xs">Try adjusting your search or add a new contact.</p>
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
            <Label htmlFor="contacts-rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20" id="contacts-rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
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
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex bg-transparent"
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
              className="hidden size-8 lg:flex bg-transparent"
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
  )
}
