"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconClock,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconMail,
  IconMessage,
  IconPencil,
  IconPlayerPlayFilled,
  IconPlus,
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
  type Row,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { duplicateCampaign, launchCampaign } from "@/actions/campaigns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CampaignId = string;
export type CampaignStatus =
  | "Completed"
  | "Scheduled"
  | "In Progress"
  | "Draft"
  | "Partial"
  | "Failed"
  | "Expired"
  | (string & {});
export type CampaignChannel = "SMS" | "Email" | "WhatsApp";
export type CampaignUrl = string;
export type AudienceName = string;

export interface DashboardCampaignRow {
  id: CampaignId;
  header: string;
  description: string | null;
  type: CampaignChannel;
  status: CampaignStatus;
  target: string;
  limit: string;
  reviewer: AudienceName;
  href: CampaignUrl;
  canLaunch: boolean;
}

export type DashboardView = "all" | "sms" | "email" | "scheduled";

const pillBadgeClassName = "text-muted-foreground gap-1.5 px-1.5";

function DragHandle({ id }: { id: CampaignId }) {
  const { attributes, listeners } = useSortable({
    id,
  });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

function getChannelBadge(type: CampaignChannel) {
  if (type === "SMS") {
    return (
      <Badge variant="outline" className={pillBadgeClassName}>
        <IconMessage className="size-3.5 text-green-600" />
        SMS
      </Badge>
    );
  }

  if (type === "WhatsApp") {
    return (
      <Badge variant="outline" className={pillBadgeClassName}>
        <IconMessage className="size-3.5 text-emerald-600" />
        WhatsApp
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={pillBadgeClassName}>
      <IconMail className="size-3.5 text-blue-600" />
      Email
    </Badge>
  );
}

function getStatusBadge(status: CampaignStatus) {
  switch (status) {
    case "Completed":
      return (
        <Badge variant="outline" className={pillBadgeClassName}>
          <IconCircleCheckFilled className="size-3.5 fill-emerald-500 text-white dark:text-black" />
          Completed
        </Badge>
      );
    case "Scheduled":
      return (
        <Badge variant="outline" className={pillBadgeClassName}>
          <IconClock className="size-3.5 text-blue-500" />
          Scheduled
        </Badge>
      );
    case "In Progress":
      return (
        <Badge variant="outline" className={pillBadgeClassName}>
          <IconLoader className="size-3.5 animate-spin text-orange-500" />
          In Progress
        </Badge>
      );
    case "Draft":
      return (
        <Badge variant="outline" className={pillBadgeClassName}>
          <IconLoader className="text-muted-foreground size-3.5" />
          Draft
        </Badge>
      );
    case "Partial":
      return (
        <Badge variant="outline" className={pillBadgeClassName}>
          <IconAlertCircle className="size-3.5 text-orange-500" />
          Partial
        </Badge>
      );
    case "Failed":
      return (
        <Badge variant="outline" className={pillBadgeClassName}>
          <IconAlertCircle className="size-3.5 text-orange-400" />
          Failed
        </Badge>
      );
    case "Expired":
      return (
        <Badge variant="outline" className={pillBadgeClassName}>
          <IconClock className="size-3.5 text-red-500" />
          Expired
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`${pillBadgeClassName} capitalize`}>
          {status}
        </Badge>
      );
  }
}

function buildColumns(
  onDuplicate: (row: DashboardCampaignRow) => Promise<void>,
  onLaunch: (row: DashboardCampaignRow) => Promise<void>,
  isDuplicating: boolean,
  isLaunching: boolean
): ColumnDef<DashboardCampaignRow>[] {
  return [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
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
      accessorKey: "header",
      header: "Campaign",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Link
            href={row.original.href}
            className="text-foreground w-fit font-medium hover:underline"
          >
            {row.original.header}
          </Link>
          {row.original.description ? (
            <span className="text-muted-foreground line-clamp-1 text-xs">
              {row.original.description}
            </span>
          ) : null}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "type",
      header: "Channel",
      cell: ({ row }) => (
        <div className="w-32">{getChannelBadge(row.original.type)}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "target",
      header: () => <div className="w-full text-right">Sent</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">{row.original.target}</div>
      ),
    },
    {
      accessorKey: "limit",
      header: () => <div className="w-full text-right">Target</div>,
      cell: ({ row }) => (
        <div className="text-muted-foreground text-right tabular-nums">
          {row.original.limit}
        </div>
      ),
    },
    {
      accessorKey: "reviewer",
      header: "Audience",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.reviewer}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href={row.original.href} className="cursor-pointer">
                <IconPencil className="mr-2 size-4" />
                {row.original.canLaunch ? "Edit" : "Open"}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isDuplicating}
              onClick={() => void onDuplicate(row.original)}
            >
              <IconCopy className="mr-2 size-4" />
              Duplicate
            </DropdownMenuItem>
            {row.original.canLaunch ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isLaunching}
                  onClick={() => void onLaunch(row.original)}
                >
                  <IconPlayerPlayFilled className="mr-2 size-4 text-emerald-600" />
                  Launch
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

const DraggableRow = ({ row }: { row: Row<DashboardCampaignRow> }) => {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
};

function DataTableHeader({
  table,
  activeView,
  setActiveView,
  counts,
}: {
  table: ReturnType<typeof useReactTable<DashboardCampaignRow>>;
  activeView: DashboardView;
  setActiveView: (view: DashboardView) => void;
  counts: ReturnType<typeof getDataTableCounts>;
}) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6">
      <Label htmlFor="dashboard-view-selector" className="sr-only">
        View
      </Label>
      <Select
        value={activeView}
        onValueChange={(value) => setActiveView(value as DashboardView)}
      >
        <SelectTrigger
          className="flex w-fit @4xl/main:hidden"
          size="sm"
          id="dashboard-view-selector"
        >
          <SelectValue placeholder="Select a view" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Campaigns</SelectItem>
          <SelectItem value="sms">SMS Campaigns</SelectItem>
          <SelectItem value="email">Email Campaigns</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
        </SelectContent>
      </Select>
      <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
        <TabsTrigger value="all">All Campaigns</TabsTrigger>
        <TabsTrigger value="sms">
          SMS <Badge variant="secondary">{counts.sms}</Badge>
        </TabsTrigger>
        <TabsTrigger value="email">
          Email <Badge variant="secondary">{counts.email}</Badge>
        </TabsTrigger>
        <TabsTrigger value="scheduled">
          Scheduled <Badge variant="secondary">{counts.scheduled}</Badge>
        </TabsTrigger>
      </TabsList>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconLayoutColumns />
              <span className="hidden lg:inline">Customize Columns</span>
              <span className="lg:hidden">Columns</span>
              <IconChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide()
              )
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
        <Button asChild variant="outline" size="sm">
          <Link href="/campaigns/new">
            <IconPlus />
            <span className="hidden lg:inline">New Campaign</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

function DataTableContent({
  table,
  columns,
  visibleRowIds,
  sortableId,
  sensors,
  handleDragEnd,
}: {
  table: ReturnType<typeof useReactTable<DashboardCampaignRow>>;
  columns: ColumnDef<DashboardCampaignRow>[];
  visibleRowIds: UniqueIdentifier[];
  sortableId: string;
  sensors: ReturnType<typeof useSensors>;
  handleDragEnd: (event: DragEndEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
        id={sortableId}
      >
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
          <TableBody className="**:data-[slot=table-cell]:first:w-8">
            {table.getRowModel().rows.length ? (
              <SortableContext
                items={visibleRowIds}
                strategy={verticalListSortingStrategy}
              >
                {table.getRowModel().rows.map((row) => (
                  <DraggableRow key={row.id} row={row} />
                ))}
              </SortableContext>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No campaigns found for this view yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}

function DataTablePagination({
  table,
}: {
  table: ReturnType<typeof useReactTable<DashboardCampaignRow>>;
}) {
  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {Math.max(table.getPageCount(), 1)}
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
  );
}

function useDataTableState(initialData: DashboardCampaignRow[]) {
  const [data, setData] = React.useState(initialData);
  const [activeView, setActiveView] = React.useState<DashboardView>("all");
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [isLaunching, setIsLaunching] = React.useState(false);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  return {
    data,
    setData,
    activeView,
    setActiveView,
    rowSelection,
    setRowSelection,
    columnVisibility,
    setColumnVisibility,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    pagination,
    setPagination,
    isDuplicating,
    setIsDuplicating,
    isLaunching,
    setIsLaunching,
  };
}

function useDataTableHandlers(router: ReturnType<typeof useRouter>) {
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [isLaunching, setIsLaunching] = React.useState(false);

  const handleDuplicate = React.useCallback(
    async (campaign: DashboardCampaignRow) => {
      if (isDuplicating) return;

      setIsDuplicating(true);
      try {
        const result = await duplicateCampaign(campaign.id);
        toast.success("Campaign duplicated successfully");
        router.push(`/campaigns/${result.data.id}/edit`);
      } catch (error: any) {
        toast.error(error?.message || "Failed to duplicate campaign");
      } finally {
        setIsDuplicating(false);
      }
    },
    [isDuplicating, router]
  );

  const handleLaunch = React.useCallback(
    async (campaign: DashboardCampaignRow) => {
      if (isLaunching) return;

      setIsLaunching(true);
      try {
        await launchCampaign(campaign.id);
        toast.success("Campaign launched successfully");
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || "Failed to launch campaign");
      } finally {
        setIsLaunching(false);
      }
    },
    [isLaunching, router]
  );

  return {
    handleDuplicate,
    handleLaunch,
    isDuplicating,
    isLaunching,
  };
}

function getFilteredData(
  data: DashboardCampaignRow[],
  activeView: DashboardView
): DashboardCampaignRow[] {
  switch (activeView) {
    case "sms":
      return data.filter((row) => row.type === "SMS");
    case "email":
      return data.filter((row) => row.type === "Email");
    case "scheduled":
      return data.filter((row) => row.status === "Scheduled");
    default:
      return data;
  }
}

function getDataTableCounts(data: DashboardCampaignRow[]) {
  return {
    all: data.length,
    sms: data.filter((row) => row.type === "SMS").length,
    email: data.filter((row) => row.type === "Email").length,
    scheduled: data.filter((row) => row.status === "Scheduled").length,
  };
}

export function DataTable({
  data: initialData,
}: {
  data: DashboardCampaignRow[];
}) {
  const router = useRouter();
  const {
    data,
    setData,
    activeView,
    setActiveView,
    rowSelection,
    setRowSelection,
    columnVisibility,
    setColumnVisibility,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    pagination,
    setPagination,
  } = useDataTableState(initialData);

  const { handleDuplicate, handleLaunch, isDuplicating, isLaunching } =
    useDataTableHandlers(router);

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const counts = React.useMemo(() => getDataTableCounts(data), [data]);

  const filteredData = React.useMemo(
    () => getFilteredData(data, activeView),
    [activeView, data]
  );

  React.useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setRowSelection({});
  }, [activeView, setPagination, setRowSelection]);

  const columns = React.useMemo(
    () =>
      buildColumns(handleDuplicate, handleLaunch, isDuplicating, isLaunching),
    [handleDuplicate, handleLaunch, isDuplicating, isLaunching]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const visibleRowIds = React.useMemo<UniqueIdentifier[]>(
    () => table.getRowModel().rows.map((row) => row.original.id),
    [table, filteredData, pagination, sorting, columnFilters]
  );

  function isInvalidDragOperation(
    active: DragEndEvent["active"] | null,
    over: DragEndEvent["over"] | null
  ): boolean {
    return !active || !over || active.id === over.id;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (isInvalidDragOperation(active, over)) {
      return;
    }

    setData((current) => {
      const oldIndex = current.findIndex((row) => row.id === active.id);
      const newIndex = current.findIndex((row) => row.id === over!.id);

      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  }

  return (
    <Tabs
      value={activeView}
      onValueChange={(value) => setActiveView(value as DashboardView)}
      className="w-full flex-col justify-start gap-6"
    >
      <DataTableHeader
        table={table}
        activeView={activeView}
        setActiveView={setActiveView}
        counts={counts}
      />

      {(["all", "sms", "email", "scheduled"] as DashboardView[]).map((view) => (
        <TabsContent
          key={view}
          value={view}
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          <DataTableContent
            table={table}
            columns={columns}
            visibleRowIds={visibleRowIds}
            sortableId={sortableId}
            sensors={sensors}
            handleDragEnd={handleDragEnd}
          />
          <DataTablePagination table={table} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
