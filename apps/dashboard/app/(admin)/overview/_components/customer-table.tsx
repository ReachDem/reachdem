"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  IconX,
  IconCheck,
  IconBan,
  IconExternalLink,
  IconSearch,
  IconLoader2,
  IconBadge,
  IconBuildingSkyscraper,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CustomerRow } from "@/lib/db";
import { approveOrg, rejectOrg, getDocumentUrl } from "../_actions/verify-org";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  not_submitted: {
    label: "Non soumis",
    className: "bg-muted text-muted-foreground border-border",
  },
  pending: {
    label: "En attente",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  },
  verified: {
    label: "Vérifié",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejeté",
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
  },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.not_submitted;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

// ─── Plan badge ───────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600 border-slate-200",
  starter: "bg-blue-50 text-blue-700 border-blue-200",
  pro: "bg-purple-50 text-purple-700 border-purple-200",
  enterprise: "bg-amber-50 text-amber-700 border-amber-200",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        PLAN_COLORS[plan] ?? PLAN_COLORS.free
      )}
    >
      {plan}
    </span>
  );
}

// ─── Document link ────────────────────────────────────────────────────────────

function isPdfKey(key: string) {
  return key.toLowerCase().endsWith(".pdf");
}

function DocumentLink({
  orgId,
  docType,
  label,
  docKey,
}: {
  orgId: string;
  docType: "id" | "business";
  label: string;
  docKey: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  async function openDoc() {
    setLoading(true);
    setError(null);
    const result = await getDocumentUrl(orgId, docType);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.url) {
      if (isPdfKey(docKey)) {
        setPreviewUrl(result.url);
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    }
  }

  return (
    <>
      <div className="space-y-0.5">
        <button
          onClick={openDoc}
          disabled={loading}
          className="text-primary flex items-center gap-1.5 text-sm hover:underline disabled:opacity-50"
        >
          {loading ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : (
            <IconExternalLink size={14} />
          )}
          {label}
          {isPdfKey(docKey) && (
            <span className="bg-muted text-muted-foreground ml-1 rounded px-1 py-0.5 text-[10px] font-medium">
              PDF
            </span>
          )}
        </button>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>

      {/* PDF inline preview modal */}
      <Dialog.Root
        open={!!previewUrl}
        onOpenChange={(v) => !v && setPreviewUrl(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-[60] flex max-h-[90vh] w-[90vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl shadow-2xl">
            <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
              <Dialog.Title className="text-sm font-semibold">
                {label}
              </Dialog.Title>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl ?? ""}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border hover:bg-muted flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors"
                >
                  <IconExternalLink size={12} />
                  Ouvrir
                </a>
                <Dialog.Close asChild>
                  <button className="hover:bg-accent text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors">
                    <IconX size={16} />
                  </button>
                </Dialog.Close>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  title={label}
                  className="h-full min-h-[70vh] w-full"
                  style={{ border: "none" }}
                />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

// ─── Verification Drawer ──────────────────────────────────────────────────────

function VerificationDrawer({
  org,
  open,
  onClose,
}: {
  org: CustomerRow;
  open: boolean;
  onClose: () => void;
}) {
  const [senderId, setSenderId] = React.useState(org.senderId ?? "");
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Reset state when org changes
  React.useEffect(() => {
    setSenderId(org.senderId ?? "");
    setFeedback(null);
  }, [org.id, org.senderId]);

  async function handleApprove() {
    setApproving(true);
    setFeedback(null);
    const result = await approveOrg(org.id, senderId);
    setApproving(false);
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({
        type: "success",
        message: "Organisation approuvée avec succès.",
      });
    }
  }

  async function handleReject() {
    setRejecting(true);
    setFeedback(null);
    const result = await rejectOrg(org.id);
    setRejecting(false);
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: "Organisation rejetée." });
    }
  }

  const isPending = org.workspaceVerificationStatus === "pending";

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "bg-background fixed top-0 right-0 z-50 h-full w-full max-w-lg overflow-y-auto shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "duration-300"
          )}
        >
          {/* Header */}
          <div className="border-border flex items-start justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {(org.companyName ?? org.name).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <Dialog.Title className="text-base leading-tight font-semibold">
                  {org.companyName ?? org.name}
                </Dialog.Title>
                <p className="text-muted-foreground text-xs">
                  {org.name} · {org.country ?? "—"}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="hover:bg-accent text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors">
                <IconX size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="space-y-6 px-6 py-5">
            {/* Status row */}
            <div className="flex items-center justify-between">
              <StatusBadge status={org.workspaceVerificationStatus} />
              <PlanBadge plan={org.planCode} />
            </div>

            {/* Org details */}
            <section className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Informations
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Pays</dt>
                <dd>{org.country ?? "—"}</dd>
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="capitalize">{org.planCode}</dd>
                <dt className="text-muted-foreground">Membres</dt>
                <dd>{org._count.members}</dd>
                <dt className="text-muted-foreground">Campagnes</dt>
                <dd>{org._count.campaigns}</dd>
                {org.websiteUrl && (
                  <>
                    <dt className="text-muted-foreground">Site web</dt>
                    <dd>
                      <a
                        href={org.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-1 truncate hover:underline"
                      >
                        <IconExternalLink size={12} />
                        {org.websiteUrl.replace(/^https?:\/\//, "")}
                      </a>
                    </dd>
                  </>
                )}
                <dt className="text-muted-foreground">Inscrit le</dt>
                <dd>{new Date(org.createdAt).toLocaleDateString("fr-FR")}</dd>
              </dl>
            </section>

            {/* Documents */}
            <section className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Documents KYB
              </h3>
              {org.idDocumentKey || org.businessDocumentKey ? (
                <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-3">
                  {org.idDocumentKey && (
                    <DocumentLink
                      orgId={org.id}
                      docType="id"
                      label="Pièce d'identité"
                      docKey={org.idDocumentKey}
                    />
                  )}
                  {org.businessDocumentKey && (
                    <DocumentLink
                      orgId={org.id}
                      docType="business"
                      label="Document commercial"
                      docKey={org.businessDocumentKey}
                    />
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Aucun document soumis
                </p>
              )}
            </section>

            {/* Sender ID + validation */}
            <section className="space-y-3">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Sender ID
              </h3>
              <div className="space-y-1">
                <label
                  className="text-muted-foreground text-sm"
                  htmlFor="sender-id-input"
                >
                  Identifiant expéditeur SMS
                </label>
                <Input
                  id="sender-id-input"
                  placeholder="ex: REACHDEM"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  maxLength={11}
                  className="font-mono text-sm"
                />
                <p className="text-muted-foreground text-xs">
                  11 caractères max · lettres et chiffres uniquement
                </p>
              </div>
            </section>

            {/* Feedback */}
            {feedback && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  feedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                )}
              >
                {feedback.message}
              </div>
            )}

            {/* Actions */}
            {isPending && (
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleApprove}
                  disabled={approving || rejecting || !senderId.trim()}
                  className="flex-1 gap-2"
                >
                  {approving ? (
                    <IconLoader2 size={16} className="animate-spin" />
                  ) : (
                    <IconCheck size={16} />
                  )}
                  Approuver
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={approving || rejecting}
                  className="flex-1 gap-2"
                >
                  {rejecting ? (
                    <IconLoader2 size={16} className="animate-spin" />
                  ) : (
                    <IconBan size={16} />
                  )}
                  Rejeter
                </Button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Customer Table ───────────────────────────────────────────────────────────

export function CustomerTable({ orgs }: { orgs: CustomerRow[] }) {
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<CustomerRow | null>(null);
  const [filter, setFilter] = React.useState<"all" | "pending">("all");

  const filtered = React.useMemo(() => {
    return orgs.filter((org) => {
      const matchFilter =
        filter === "all" || org.workspaceVerificationStatus === "pending";
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        org.name.toLowerCase().includes(q) ||
        (org.companyName?.toLowerCase().includes(q) ?? false) ||
        (org.senderId?.toLowerCase().includes(q) ?? false) ||
        (org.country?.toLowerCase().includes(q) ?? false);
      return matchFilter && matchSearch;
    });
  }, [orgs, search, filter]);

  const pendingCount = orgs.filter(
    (o) => o.workspaceVerificationStatus === "pending"
  ).length;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <IconSearch
            size={15}
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            placeholder="Rechercher un client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-9 text-sm"
          />
        </div>
        <div className="border-border flex overflow-hidden rounded-md border text-xs font-medium">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              filter === "all"
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            Tous ({orgs.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={cn(
              "border-border border-l px-3 py-1.5 transition-colors",
              filter === "pending"
                ? "bg-amber-600 text-white"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            En attente {pendingCount > 0 && `(${pendingCount})`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/40 border-b">
              <th className="text-muted-foreground px-4 py-2.5 text-left font-medium">
                Organisation
              </th>
              <th className="text-muted-foreground hidden px-4 py-2.5 text-left font-medium sm:table-cell">
                Pays
              </th>
              <th className="text-muted-foreground hidden px-4 py-2.5 text-left font-medium md:table-cell">
                Plan
              </th>
              <th className="text-muted-foreground px-4 py-2.5 text-left font-medium">
                Sender ID
              </th>
              <th className="text-muted-foreground px-4 py-2.5 text-left font-medium">
                Statut KYB
              </th>
              <th className="text-muted-foreground hidden px-4 py-2.5 text-right font-medium lg:table-cell">
                Inscrit
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-4 py-10 text-center text-sm"
                >
                  Aucun client trouvé.
                </td>
              </tr>
            )}
            {filtered.map((org) => (
              <tr
                key={org.id}
                onClick={() => setSelected(org)}
                className={cn(
                  "border-border cursor-pointer border-b transition-colors last:border-0",
                  "hover:bg-muted/50",
                  org.workspaceVerificationStatus === "pending" &&
                    "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/10"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {(org.companyName ?? org.name)
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {org.companyName ?? org.name}
                      </p>
                      {org.companyName && (
                        <p className="text-muted-foreground truncate text-xs">
                          {org.name}
                        </p>
                      )}
                    </div>
                    {org.workspaceVerificationStatus === "pending" && (
                      <span className="ml-1 size-2 shrink-0 rounded-full bg-amber-500" />
                    )}
                  </div>
                </td>
                <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                  {org.country ?? "—"}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <PlanBadge plan={org.planCode} />
                </td>
                <td className="px-4 py-3">
                  {org.senderId ? (
                    <span className="bg-muted inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs">
                      <IconBadge size={11} />
                      {org.senderId}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">
                      —
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={org.workspaceVerificationStatus} />
                </td>
                <td className="text-muted-foreground hidden px-4 py-3 text-right text-xs lg:table-cell">
                  {new Date(org.createdAt).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selected && (
        <VerificationDrawer
          org={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
