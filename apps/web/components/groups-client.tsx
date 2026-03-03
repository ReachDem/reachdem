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
  IconChevronRight,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";

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
  type Group,
  type Contact,
  listGroups,
  createGroup,
  deleteGroup,
  listGroupContacts,
} from "@/lib/api/groups";

interface GroupsClientProps {
  initialGroups: Group[];
}

// ─── Group Panel (right column) ──────────────────────────────────────────────

function GroupPanel({ group }: { group: Group }) {
  const router = useRouter();
  const [members, setMembers] = React.useState<Contact[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGroupContacts(group.id, { limit: 50 })
      .then((res) => {
        if (!cancelled) {
          setMembers(res.items);
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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Panel header */}
      <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{group.name}</h2>
          {group.description && (
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              {group.description}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => router.push(`/contacts/groups/${group.id}`)}
        >
          <IconPencil className="size-3.5" />
          Gérer
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-6 py-3">
        <Badge variant="secondary" className="gap-1.5 font-normal">
          <IconUsers className="size-3" />
          {total} membre{total !== 1 ? "s" : ""}
        </Badge>
        <span className="text-muted-foreground text-xs">
          Modifié{" "}
          {formatDistanceToNow(new Date(group.updatedAt), { addSuffix: true })}
        </span>
      </div>

      {/* Members preview */}
      <div className="flex flex-1 flex-col px-6 pb-6">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <IconLoader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-sm">
            <IconUsers className="size-8 opacity-30" />
            <p>Aucun membre dans ce groupe.</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => router.push(`/contacts/groups/${group.id}`)}
            >
              Ajouter des contacts
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {members.slice(0, 12).map((m) => (
              <div
                key={m.id}
                className="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
              >
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium uppercase">
                  {m.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  {(m.email || m.phoneE164) && (
                    <p className="text-muted-foreground truncate text-xs">
                      {m.email ?? m.phoneE164}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {total > 12 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground mt-1 w-full justify-center gap-1 text-xs"
                onClick={() => router.push(`/contacts/groups/${group.id}`)}
              >
                Voir les {total - 12} autres membres
                <IconChevronRight className="size-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function GroupsClient({ initialGroups }: GroupsClientProps) {
  const router = useRouter();

  const [groups, setGroups] = React.useState<Group[]>(initialGroups);
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Group | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const selectedGroup = React.useMemo(
    () => groups.find((g) => g.id === selectedId) ?? null,
    [groups, selectedId]
  );

  // Client-side filtering
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
      toast.success(`Groupe "${group.name}" créé !`);
      setCreateOpen(false);
      setGroups((prev) => [group, ...prev]);
      setSelectedId(group.id);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Échec de la création du groupe";
      setCreateError(msg);
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteGroup(deleteTarget.id);
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      toast.success(`Groupe "${deleteTarget.name}" supprimé.`);
    } catch {
      toast.error("Échec de la suppression. Veuillez réessayer.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  // Refresh list on mount
  React.useEffect(() => {
    async function refresh() {
      try {
        const result = await listGroups({ limit: 100 });
        setGroups(result.items ?? []);
      } catch {
        // silently fail, use initial data
      }
    }
    refresh();
  }, []);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (groups.length === 0 && !search) {
    return (
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b px-4 py-4 md:px-6 md:py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Groupes</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Organisez vos contacts en listes statiques pour des actions
              ciblées.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <IconPlus className="size-4" />
            <span className="hidden sm:inline">Créer un groupe</span>
          </Button>
        </div>

        {/* Empty state */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-muted flex size-16 items-center justify-center rounded-2xl">
              <IconUsers className="text-muted-foreground size-8" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold">Aucun groupe</p>
              <p className="text-muted-foreground max-w-sm text-sm">
                Créez votre premier groupe pour segmenter vos contacts et lancer
                des campagnes ciblées.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setCreateOpen(true)}
              className="mt-2 gap-2"
            >
              <IconPlus className="size-4" />
              Créer mon premier groupe
            </Button>
          </div>
        </div>

        <CreateGroupDialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setCreateError(null);
          }}
          onSubmit={handleCreate}
          isPending={isPending}
          error={createError}
        />
      </div>
    );
  }

  // ── Main layout ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 border-b px-4 py-4 md:px-6 md:py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Groupes</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Organisez vos contacts en listes statiques pour des actions ciblées.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <IconPlus className="size-4" />
          <span className="hidden sm:inline">Créer un groupe</span>
        </Button>
      </div>

      {/* Body: two-column on desktop, single-column on mobile */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar: group list ── */}
        <div className="flex w-full flex-col border-r md:w-72 md:shrink-0 lg:w-80">
          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <IconSearch className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                Aucun groupe trouvé.
              </p>
            ) : (
              filtered.map((group) => (
                <GroupListItem
                  key={group.id}
                  group={group}
                  isSelected={group.id === selectedId}
                  onSelect={(id) => {
                    // Mobile → navigate directly
                    if (window.innerWidth < 768) {
                      router.push(`/contacts/groups/${id}`);
                    } else {
                      setSelectedId(id);
                    }
                  }}
                  onEdit={(id) => router.push(`/contacts/groups/${id}`)}
                  onDelete={(g) => setDeleteTarget(g)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: group detail ── */}
        <div className="hidden flex-1 flex-col md:flex">
          {selectedGroup ? (
            <GroupPanel key={selectedGroup.id} group={selectedGroup} />
          ) : (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 text-sm">
              <IconUsers className="size-8 opacity-20" />
              <p>Sélectionner un groupe pour l&apos;afficher</p>
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <CreateGroupDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateError(null);
        }}
        onSubmit={handleCreate}
        isPending={isPending}
        error={createError}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le groupe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le groupe <strong>&quot;{deleteTarget?.name}&quot;</strong> sera
              définitivement supprimé. Les contacts ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {isDeleting ? (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Supprimer
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
  onDelete: (group: Group) => void;
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
      className={`group relative flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors ${
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase transition-colors ${
          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {group.name.charAt(0)}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-tight font-medium">
          {group.name}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="h-4 gap-0.5 px-1.5 text-[10px] font-normal"
          >
            <IconUsers className="size-2.5" />
            {group._count?.members ?? 0}
          </Badge>
          {group.description && (
            <p className="text-muted-foreground truncate text-xs">
              {group.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions — shown on hover or selection */}
      {(hovered || isSelected) && (
        <div
          className="flex shrink-0 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Gérer le groupe"
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
            title="Supprimer le groupe"
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
          <DialogTitle>Créer un groupe</DialogTitle>
          <DialogDescription>
            Donnez un nom à votre groupe pour commencer à y ajouter des
            contacts.
          </DialogDescription>
        </DialogHeader>
        <GroupForm
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Créer le groupe"
          isPending={isPending}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}
