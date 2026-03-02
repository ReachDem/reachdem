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
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  type Contact,
  listGroupContacts,
  addGroupMembers,
  removeGroupMembers,
  listContacts,
} from "@/lib/api/groups";

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
  totalContacts,
}: GroupDetailClientProps) {
  const [members, setMembers] = React.useState<Contact[]>(initialMembers);
  const [memberCount, setMemberCount] = React.useState(totalMembers);

  // All org contacts (for picker)
  const [allContacts, setAllContacts] =
    React.useState<Contact[]>(initialContacts);
  const [pickerSearch, setPickerSearch] = React.useState("");

  // Selection state
  const [selectedMembers, setSelectedMembers] = React.useState<Set<string>>(
    new Set()
  );
  const [selectedToAdd, setSelectedToAdd] = React.useState<Set<string>>(
    new Set()
  );

  // Loading states
  const [isAdding, setIsAdding] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<Contact | null>(null);
  const [memberSearch, setMemberSearch] = React.useState("");

  // Compute the set of already-member ids for quick lookup
  const memberIds = React.useMemo(
    () => new Set(members.map((m) => m.id)),
    [members]
  );

  // When there are members, we might want to hide the picker — show it if there are contacts not yet in group
  const nonMemberContacts = React.useMemo(
    () => allContacts.filter((c) => !memberIds.has(c.id)),
    [allContacts, memberIds]
  );

  const showPicker = nonMemberContacts.length > 0 || memberCount === 0;

  // Filtered lists
  const filteredMembers = React.useMemo(() => {
    const q = memberSearch.toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phoneE164?.includes(q)
    );
  }, [members, memberSearch]);

  const filteredContactsForPicker = React.useMemo(() => {
    const q = pickerSearch.toLowerCase();
    const base = allContacts;
    if (!q) return base;
    return base.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phoneE164?.includes(q)
    );
  }, [allContacts, pickerSearch]);

  // Add selected contacts to the group
  async function handleAdd() {
    if (selectedToAdd.size === 0) return;
    setIsAdding(true);
    try {
      await addGroupMembers(groupId, [...selectedToAdd]);
      // Re-fetch members
      const result = await listGroupContacts(groupId, { limit: 200 });
      setMembers(result.items);
      setMemberCount(result.meta.total);
      setSelectedToAdd(new Set());
      toast.success(`Added ${selectedToAdd.size} contact(s) to the group.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add contacts";
      toast.error(msg);
    } finally {
      setIsAdding(false);
    }
  }

  // Remove a single contact
  async function handleRemoveSingle(contact: Contact) {
    setRemoveTarget(null);
    setIsRemoving(true);
    try {
      await removeGroupMembers(groupId, [contact.id]);
      setMembers((prev) => prev.filter((m) => m.id !== contact.id));
      setMemberCount((c) => c - 1);
      // Re-fetch all contacts so picker updates
      const res = await listContacts({ limit: 200 });
      setAllContacts(res.items);
      toast.success(`${contact.name} removed from the group.`);
    } catch {
      toast.error("Failed to remove contact. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  // Bulk remove
  async function handleBulkRemove() {
    if (selectedMembers.size === 0) return;
    setIsRemoving(true);
    try {
      await removeGroupMembers(groupId, [...selectedMembers]);
      const removed = selectedMembers;
      setMembers((prev) => prev.filter((m) => !removed.has(m.id)));
      setMemberCount((c) => c - removed.size);
      setSelectedMembers(new Set());
      toast.success(`Removed ${removed.size} member(s) from the group.`);
    } catch {
      toast.error("Failed to remove members. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  function toggleMemberSelect(id: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePickerSelect(id: string) {
    if (memberIds.has(id)) return; // already member
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const MembersPanel = (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search members…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        {selectedMembers.size > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive gap-1.5"
            onClick={handleBulkRemove}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconUserMinus className="size-4" />
            )}
            Remove {selectedMembers.size} selected
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
          <IconUsers className="mx-auto mb-2 size-8 opacity-30" />
          <p>No members yet. Add contacts from the panel on the right.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      selectedMembers.size === members.length &&
                      members.length > 0
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMembers(new Set(members.map((m) => m.id)));
                      } else {
                        setSelectedMembers(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    No members match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedMembers.has(member.id)}
                        onCheckedChange={() => toggleMemberSelect(member.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{member.name}</span>
                      {member.enterprise && (
                        <p className="text-muted-foreground text-xs">
                          {member.enterprise}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      {member.email || member.phoneE164 || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive size-8"
                        onClick={() => setRemoveTarget(member)}
                        disabled={isRemoving}
                      >
                        <IconUserMinus className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  const PickerPanel = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search contacts…"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Button
          size="sm"
          disabled={selectedToAdd.size === 0 || isAdding}
          onClick={handleAdd}
          className="shrink-0 gap-1.5"
        >
          {isAdding ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconUserPlus className="size-4" />
          )}
          Add {selectedToAdd.size > 0 ? `(${selectedToAdd.size})` : "selected"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Contact</TableHead>
              <TableHead className="w-28 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContactsForPicker.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground py-8 text-center text-sm"
                >
                  {allContacts.length === 0
                    ? "No contacts in your workspace yet."
                    : "No contacts match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filteredContactsForPicker.map((contact) => {
                const isMember = memberIds.has(contact.id);
                return (
                  <TableRow
                    key={contact.id}
                    className={isMember ? "opacity-50" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedToAdd.has(contact.id) || isMember}
                        onCheckedChange={() => togglePickerSelect(contact.id)}
                        disabled={isMember}
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${isMember ? "line-through" : ""}`}
                      >
                        {contact.name}
                      </span>
                      {contact.enterprise && (
                        <p className="text-muted-foreground text-xs">
                          {contact.enterprise}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      {contact.email || contact.phoneE164 || "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {isMember && (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-xs font-normal"
                        >
                          <IconCheck className="size-3" />
                          In group
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      {/* Stats row */}
      <div className="flex items-center gap-4 px-4 pb-2 md:px-6">
        <Badge variant="outline" className="gap-1.5 text-sm font-normal">
          <IconUsers className="size-3.5" />
          {memberCount} member{memberCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Desktop: 2-column layout | Mobile: Tabs */}
      <div className="hidden px-4 pb-8 md:grid md:grid-cols-[3fr_2fr] md:gap-6 md:px-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            Members
          </h2>
          {MembersPanel}
        </div>
        {showPicker && (
          <div className="flex flex-col gap-2">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
              Add contacts
            </h2>
            {PickerPanel}
          </div>
        )}
      </div>

      {/* Mobile: Tabs */}
      <div className="px-4 pb-8 md:hidden">
        <Tabs defaultValue="members">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="members" className="flex-1">
              Members ({memberCount})
            </TabsTrigger>
            {showPicker && (
              <TabsTrigger value="add" className="flex-1">
                Add contacts
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="members">{MembersPanel}</TabsContent>
          {showPicker && <TabsContent value="add">{PickerPanel}</TabsContent>}
        </Tabs>
      </div>

      {/* Remove single confirm */}
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
    </>
  );
}
