"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Trash2,
  Send,
  Users,
  Mail,
  Megaphone,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HermesEmailPreview } from "./hermes-email-preview";
import type { HermesPendingApproval } from "@/hooks/use-hermes-chat";

// ── Tool metadata ─────────────────────────────────────────────────────────────

const TOOL_META: Record<
  string,
  {
    label: string;
    description?: string;
    icon: typeof Users;
    variant: "default" | "destructive" | "warning";
  }
> = {
  create_group: {
    label: "Créer un groupe",
    icon: Users,
    variant: "default",
  },
  update_group: {
    label: "Modifier un groupe",
    icon: Users,
    variant: "default",
  },
  delete_group: {
    label: "Supprimer un groupe",
    icon: Trash2,
    variant: "destructive",
  },
  create_campaign: {
    label: "Créer une campagne",
    icon: Megaphone,
    variant: "default",
  },
  update_campaign: {
    label: "Modifier une campagne",
    icon: Megaphone,
    variant: "default",
  },
  delete_campaign: {
    label: "Supprimer une campagne",
    icon: Trash2,
    variant: "destructive",
  },
  send_sms: {
    label: "Envoyer un SMS",
    icon: Send,
    variant: "warning",
  },
  send_email: {
    label: "Envoyer un email",
    icon: Mail,
    variant: "warning",
  },
  craft_email: {
    label: "Composer un email",
    icon: Mail,
    variant: "default",
  },
};

// ── Arg display ───────────────────────────────────────────────────────────────

function ArgRow({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-muted-foreground w-28 shrink-0 capitalize">
        {label}
      </span>
      <span className="text-foreground flex-1 break-words">
        {String(value)}
      </span>
    </div>
  );
}

function ArgsPreview({
  toolName,
  args,
}: {
  toolName: string;
  args: Record<string, unknown>;
}) {
  const entries = Object.entries(args).filter(
    ([k]) => k !== "emailJsx" && k !== "subject"
  );

  const emailJsx = args.emailJsx as string | undefined;
  const subject = args.subject as string | undefined;

  return (
    <div className="bg-muted/60 mt-2 space-y-1.5 rounded-md p-2.5">
      {subject && <ArgRow label="Sujet" value={subject} />}
      {entries.map(([k, v]) => (
        <ArgRow key={k} label={k.replace(/_/g, " ")} value={v} />
      ))}
      {emailJsx && toolName === "craft_email" && (
        <HermesEmailPreview jsx={emailJsx} subject={subject} />
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

interface HermesApprovalCardProps {
  approval: HermesPendingApproval;
  onApprove: () => void;
  onDismiss: () => void;
}

export function HermesApprovalCard({
  approval,
  onApprove,
  onDismiss,
}: HermesApprovalCardProps) {
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const meta = TOOL_META[approval.toolName];
  if (!meta) return null;

  const Icon = meta.icon;
  const isDestructive = meta.variant === "destructive";
  const isWarning = meta.variant === "warning";

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove();
      setApproved(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    onDismiss();
    setDismissed(true);
  };

  if (dismissed) {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 py-1 text-xs">
        <AlertTriangle className="h-3.5 w-3.5" />
        Action annulée
      </div>
    );
  }

  if (approved) {
    return (
      <div className="flex items-center gap-1.5 py-1 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approuvé
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card space-y-3 rounded-xl border p-3.5",
        isDestructive && "border-destructive/40 bg-destructive/5",
        isWarning && "border-amber-500/40 bg-amber-500/5"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            isDestructive
              ? "bg-destructive/15 text-destructive"
              : "bg-primary/10 text-primary",
            isWarning && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm leading-tight font-medium">{meta.label}</p>
          {isDestructive && (
            <p className="text-destructive text-[11px]">Action irréversible</p>
          )}
        </div>
        {isWarning && (
          <Badge
            variant="outline"
            className="ml-auto border-amber-400/50 text-[10px] text-amber-600"
          >
            Envoi
          </Badge>
        )}
      </div>

      {/* Args preview */}
      <ArgsPreview toolName={approval.toolName} args={approval.args} />

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleDismiss}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button
          variant={isDestructive ? "destructive" : "default"}
          size="sm"
          className="h-7 text-xs"
          onClick={handleApprove}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isDestructive ? (
            "Supprimer"
          ) : (
            "Confirmer"
          )}
        </Button>
      </div>
    </div>
  );
}
