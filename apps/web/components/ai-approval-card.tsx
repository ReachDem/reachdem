"use client";

import {
  AlertTriangle,
  CheckCircle,
  Mail,
  MessageSquare,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PendingApproval } from "@/lib/ai/types";

interface AIApprovalCardProps {
  approval: PendingApproval;
  onApprove: (approval: PendingApproval) => void;
  onDismiss: (id: string) => void;
  isLoading?: boolean;
}

const riskConfig = {
  low: {
    icon: Zap,
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    border: "border-emerald-500/20",
    label: "Low risk",
  },
  medium: {
    icon: AlertTriangle,
    badge: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    border: "border-amber-500/20",
    label: "Medium risk",
  },
  high: {
    icon: ShieldAlert,
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    border: "border-destructive/20",
    label: "High risk",
  },
};

/** Channel choice card — two large buttons: SMS / Email */
function ChannelChoiceCard({
  approval,
  onApprove,
  onDismiss,
  isLoading,
}: AIApprovalCardProps) {
  const handleChannel = (channel: "sms" | "email") => {
    onApprove({
      ...approval,
      input: {
        ...((approval.input as Record<string, unknown>) ?? {}),
        channel,
      },
    });
  };

  return (
    <div className="border-primary/20 bg-card space-y-3 rounded-xl border p-4 shadow-sm">
      <p className="text-sm leading-snug font-medium">{approval.summary}</p>
      <p className="text-muted-foreground text-xs">
        Quel canal veux-tu utiliser pour cette campagne ?
      </p>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="hover:border-primary hover:bg-primary/5 h-12 flex-1 flex-col gap-1 border-2 text-xs"
          onClick={() => handleChannel("sms")}
          disabled={isLoading}
        >
          <MessageSquare className="h-4 w-4" />
          SMS
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="hover:border-primary hover:bg-primary/5 h-12 flex-1 flex-col gap-1 border-2 text-xs"
          onClick={() => handleChannel("email")}
          disabled={isLoading}
        >
          <Mail className="h-4 w-4" />
          Email
        </Button>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground h-7 w-full text-xs"
        onClick={() => onDismiss(approval.id)}
        disabled={isLoading}
      >
        Annuler
      </Button>
    </div>
  );
}

/** SMS preview / confirm card — editable fields with confirm button */
function SMSPreviewCard({
  approval,
  onApprove,
  onDismiss,
  isLoading,
}: AIApprovalCardProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (approval.editableFields ?? []).map((f) => [f.key, f.value])
    )
  );

  const handleConfirm = () => {
    const updatedInput = {
      ...((approval.input as Record<string, unknown>) ?? {}),
      ...fieldValues,
    };
    onApprove({ ...approval, input: updatedInput });
  };

  const smsBody = fieldValues["smsBody"] ?? "";
  const charCount = smsBody.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="border-primary/20 bg-card space-y-3 rounded-xl border p-4 shadow-sm">
      <p className="text-sm leading-snug font-medium">{approval.summary}</p>
      {approval.editableFields?.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label className="text-muted-foreground text-xs font-medium">
            {field.label}
          </Label>
          {field.multiline ? (
            <div className="relative">
              <Textarea
                value={fieldValues[field.key] ?? ""}
                placeholder={field.placeholder}
                rows={4}
                className="resize-none pr-16 text-xs"
                onChange={(e) =>
                  setFieldValues((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                disabled={isLoading}
              />
              {field.key === "smsBody" && (
                <span
                  className={cn(
                    "absolute right-2 bottom-2 text-[10px] tabular-nums",
                    charCount > 320
                      ? "text-destructive"
                      : charCount > 160
                        ? "text-amber-500"
                        : "text-muted-foreground"
                  )}
                >
                  {charCount}/{smsSegments > 1 ? `${smsSegments}×160` : "160"}
                </span>
              )}
            </div>
          ) : (
            <Input
              value={fieldValues[field.key] ?? ""}
              placeholder={field.placeholder}
              className="h-8 text-xs"
              onChange={(e) =>
                setFieldValues((prev) => ({
                  ...prev,
                  [field.key]: e.target.value,
                }))
              }
              disabled={isLoading}
            />
          )}
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={handleConfirm}
          disabled={isLoading || charCount === 0}
        >
          <CheckCircle className="mr-1.5 h-3 w-3" />
          Créer la campagne
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground h-7 text-xs"
          onClick={() => onDismiss(approval.id)}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}

export function AIApprovalCard({
  approval,
  onApprove,
  onDismiss,
  isLoading,
}: AIApprovalCardProps) {
  // Delegate to specialised cards based on `kind`
  if (approval.kind === "channelChoice") {
    return (
      <ChannelChoiceCard
        approval={approval}
        onApprove={onApprove}
        onDismiss={onDismiss}
        isLoading={isLoading}
      />
    );
  }
  if (approval.kind === "smsPreview") {
    return (
      <SMSPreviewCard
        approval={approval}
        onApprove={onApprove}
        onDismiss={onDismiss}
        isLoading={isLoading}
      />
    );
  }

  const risk = riskConfig[approval.riskLevel];
  const RiskIcon = risk.icon;

  // Local state for editable fields
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (approval.editableFields ?? []).map((f) => [f.key, f.value])
    )
  );

  const handleApprove = () => {
    if (!approval.editableFields?.length) {
      onApprove(approval);
      return;
    }
    const updatedInput = {
      ...((approval.input as Record<string, unknown>) ?? {}),
      ...fieldValues,
    };
    onApprove({ ...approval, input: updatedInput });
  };

  return (
    <div
      className={cn(
        "bg-card space-y-3 rounded-xl border p-4 shadow-sm",
        risk.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <RiskIcon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm leading-snug font-medium">{approval.summary}</p>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-xs", risk.badge)}>
          {risk.label}
        </Badge>
      </div>

      {approval.targetLabel && (
        <p className="text-muted-foreground pl-6 text-xs">
          Target:{" "}
          <span className="text-foreground font-medium">
            {approval.targetLabel}
          </span>
        </p>
      )}

      {/* Editable fields */}
      {approval.editableFields && approval.editableFields.length > 0 && (
        <div className="space-y-2.5 pt-1">
          {approval.editableFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-muted-foreground text-xs font-medium">
                {field.label}
              </Label>
              {field.multiline ? (
                <Textarea
                  value={fieldValues[field.key] ?? ""}
                  placeholder={field.placeholder}
                  rows={2}
                  className="resize-none text-xs"
                  onChange={(e) =>
                    setFieldValues((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  disabled={isLoading}
                />
              ) : (
                <Input
                  value={fieldValues[field.key] ?? ""}
                  placeholder={field.placeholder}
                  className="h-8 text-xs"
                  onChange={(e) =>
                    setFieldValues((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  disabled={isLoading}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleApprove}
          disabled={isLoading}
        >
          <CheckCircle className="mr-1.5 h-3 w-3" />
          Approuver
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground h-7 text-xs"
          onClick={() => onDismiss(approval.id)}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
