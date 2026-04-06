"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  type: "info" | "promo" | "maintenance" | "feature";
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
}

interface AnnouncementsEditorProps {
  announcements: AnnouncementRow[];
  onCreate: (
    input: Omit<AnnouncementRow, "id" | "createdAt">
  ) => Promise<AnnouncementRow>;
  onUpdate: (announcement: AnnouncementRow) => Promise<void>;
}

const TYPE_COLORS: Record<AnnouncementRow["type"], string> = {
  info: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  promo: "border-violet-400/30 bg-violet-400/10 text-violet-400",
  maintenance: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  feature: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
};

const BLANK: Omit<AnnouncementRow, "id" | "createdAt"> = {
  title: "",
  body: "",
  type: "info",
  active: true,
  startsAt: null,
  endsAt: null,
};

export function AnnouncementsEditor({
  announcements,
  onCreate,
  onUpdate,
}: AnnouncementsEditorProps) {
  const [list, setList] = useState(announcements);
  const [modalData, setModalData] = useState<Partial<AnnouncementRow> | null>(
    null
  );
  const isNew = modalData && !("id" in modalData);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!modalData) return;

    startTransition(async () => {
      if (isNew) {
        const created = await onCreate(
          modalData as Omit<AnnouncementRow, "id" | "createdAt">
        );
        setList((previous) => [created, ...previous]);
      } else {
        await onUpdate(modalData as AnnouncementRow);
        setList((previous) =>
          previous.map((announcement) =>
            announcement.id === (modalData as AnnouncementRow).id
              ? (modalData as AnnouncementRow)
              : announcement
          )
        );
      }

      setModalData(null);
    });
  };

  const handleToggle = (announcement: AnnouncementRow) => {
    const updated = { ...announcement, active: !announcement.active };

    startTransition(async () => {
      await onUpdate(updated);
      setList((previous) =>
        previous.map((current) =>
          current.id === announcement.id ? updated : current
        )
      );
    });
  };

  return (
    <>
      <Card className="rounded-[26px] border border-white/6">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Megaphone className="h-4 w-4" aria-hidden="true" />
                Announcements & Promotions
              </CardTitle>
              <CardDescription className="text-sm">
                Manage in-app announcements, offers, and maintenance notices
              </CardDescription>
              <p
                aria-live="polite"
                className="mt-2 text-sm text-[color:var(--founder-muted-foreground)]"
              >
                {list.length.toLocaleString()} announcement
                {list.length === 1 ? "" : "s"} available
              </p>
            </div>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-sm"
              onClick={() => setModalData({ ...BLANK })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-4">
          <div className="w-full overflow-hidden">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="min-w-[800px]">
                <Table className="table-fixed border-separate border-spacing-0 [&_tr:not(:last-child)_td]:border-b">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="border-border bg-muted/50 relative h-11 border-y px-3 text-left font-medium select-none first:rounded-l-lg first:border-l first:pl-6 last:rounded-r-lg last:border-r last:pr-6">
                        Title
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-24 border-y px-3 text-left font-medium select-none">
                        Type
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-20 border-y px-3 text-left font-medium select-none">
                        Status
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-28 border-y px-3 text-left font-medium select-none">
                        Starts
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-28 border-y px-3 text-left font-medium select-none">
                        Ends
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-20 border-y px-3 text-right font-medium select-none last:rounded-r-lg last:border-r last:pr-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.length === 0 ? (
                      <TableRow className="border-0 [&>td:first-child]:rounded-tl-lg [&>td:first-child]:rounded-bl-lg [&>td:last-child]:rounded-tr-lg [&>td:last-child]:rounded-br-lg">
                        <TableCell
                          colSpan={6}
                          className="text-muted-foreground h-24 px-4 text-center text-sm"
                        >
                          No announcements yet — create one above
                        </TableCell>
                      </TableRow>
                    ) : (
                      list.map((announcement) => (
                        <TableRow
                          key={announcement.id}
                          className="hover:bg-muted/30 border-0 [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                        >
                          <TableCell className="px-3 py-3 font-medium first:pl-6 last:pr-6">
                            {announcement.title}
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize",
                                TYPE_COLORS[announcement.type]
                              )}
                            >
                              {announcement.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                announcement.active
                                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                                  : "border-muted text-muted-foreground"
                              )}
                            >
                              {announcement.active ? "Active" : "Off"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground px-3 py-3">
                            {announcement.startsAt
                              ? new Date(
                                  announcement.startsAt
                                ).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground px-3 py-3">
                            {announcement.endsAt
                              ? new Date(
                                  announcement.endsAt
                                ).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-right last:pr-6">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                aria-label={`Edit announcement ${announcement.title}`}
                                onClick={() =>
                                  setModalData({ ...announcement })
                                }
                              >
                                <Pencil
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                aria-label={`${announcement.active ? "Turn off" : "Turn on"} announcement ${announcement.title}`}
                                onClick={() => handleToggle(announcement)}
                                disabled={isPending}
                              >
                                {announcement.active ? (
                                  <ToggleRight
                                    className="h-4 w-4 text-emerald-400"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <ToggleLeft
                                    className="text-muted-foreground h-4 w-4"
                                    aria-hidden="true"
                                  />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!modalData}
        onOpenChange={(open) => !open && setModalData(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {isNew ? "New Announcement" : "Edit Announcement"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[color:var(--founder-muted-foreground)]">
              Set the message, audience tone, and schedule for this in-product
              update.
            </DialogDescription>
          </DialogHeader>

          {modalData ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="announcement-title" className="text-sm">
                  Title
                </Label>
                <Input
                  id="announcement-title"
                  name="announcement-title"
                  autoComplete="off"
                  className="h-9 text-sm"
                  value={modalData.title ?? ""}
                  onChange={(event) =>
                    setModalData({ ...modalData, title: event.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="announcement-body" className="text-sm">
                  Body
                </Label>
                <Textarea
                  id="announcement-body"
                  name="announcement-body"
                  className="text-sm"
                  rows={3}
                  value={modalData.body ?? ""}
                  onChange={(event) =>
                    setModalData({ ...modalData, body: event.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Type</Label>
                <Select
                  value={modalData.type ?? "info"}
                  onValueChange={(value) =>
                    setModalData({
                      ...modalData,
                      type: (value ?? "info") as AnnouncementRow["type"],
                    })
                  }
                >
                  <SelectTrigger
                    aria-label="Select announcement type"
                    className="h-9 w-full text-sm"
                  >
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="announcement-starts" className="text-sm">
                    Starts
                  </Label>
                  <Input
                    id="announcement-starts"
                    name="announcement-starts"
                    className="h-9 text-sm"
                    type="date"
                    value={
                      modalData.startsAt
                        ? new Date(modalData.startsAt)
                            .toISOString()
                            .slice(0, 10)
                        : ""
                    }
                    onChange={(event) =>
                      setModalData({
                        ...modalData,
                        startsAt: event.target.value
                          ? new Date(event.target.value)
                          : null,
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="announcement-ends" className="text-sm">
                    Ends
                  </Label>
                  <Input
                    id="announcement-ends"
                    name="announcement-ends"
                    className="h-9 text-sm"
                    type="date"
                    value={
                      modalData.endsAt
                        ? new Date(modalData.endsAt).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(event) =>
                      setModalData({
                        ...modalData,
                        endsAt: event.target.value
                          ? new Date(event.target.value)
                          : null,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm"
              onClick={() => setModalData(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 text-sm"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2
                  className="mr-1.5 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {isNew ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
