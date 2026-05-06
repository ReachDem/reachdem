"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  IconMail,
  IconMessage,
  IconBrandWhatsapp,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { AdminBroadcast } from "@reachdem/database";

type BroadcastWithCount = AdminBroadcast & { _count: { recipients: number } };

interface Props {
  broadcasts: BroadcastWithCount[];
}

const CHANNEL_ICON = {
  EMAIL: IconMail,
  SMS: IconMessage,
  WHATSAPP: IconBrandWhatsapp,
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
};

export function BroadcastHistory({ broadcasts }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (broadcasts.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        No broadcasts yet. Send your first one above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {broadcasts.map((b) => {
        const Icon = CHANNEL_ICON[b.channel];
        const isOpen = expanded === b.id;
        const meta = b.metadata as Record<string, string> | null;

        return (
          <div
            key={b.id}
            className="border-border bg-card overflow-hidden rounded-lg border"
          >
            {/* Row*/}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : b.id)}
              className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
            >
              <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                <Icon size={16} className="text-foreground/60" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">
                  {b.subject || b.body.slice(0, 60)}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {b.sentAt
                    ? format(new Date(b.sentAt), "MMM d, yyyy · HH:mm")
                    : format(new Date(b.createdAt), "MMM d, yyyy")}
                  {" · "}
                  {b._count.recipients} recipients
                  {" · "}by {b.sentBy}
                </p>
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  STATUS_COLOR[b.status]
                )}
              >
                {b.status}
              </span>

              {isOpen ? (
                <IconChevronUp
                  size={14}
                  className="text-muted-foreground shrink-0"
                />
              ) : (
                <IconChevronDown
                  size={14}
                  className="text-muted-foreground shrink-0"
                />
              )}
            </button>

            {/* Expanded stats*/}
            {isOpen && (
              <div className="border-border border-t px-4 py-3">
                {b.channel === "EMAIL" && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="Recipients" value={b._count.recipients} />
                    <StatCard
                      label="From"
                      value={meta?.fromEmail ?? meta?.fromName ?? "—"}
                      small
                    />
                  </div>
                )}
                <div className="mt-3">
                  <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
                    Broadcast ID
                  </p>
                  <p className="text-foreground/60 font-mono text-xs">{b.id}</p>
                </div>
                {b.subject && (
                  <div className="mt-3">
                    <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
                      Preview
                    </p>
                    <p className="text-foreground/70 line-clamp-3 text-xs">
                      {b.body.replace(/<[^>]+>/g, " ").slice(0, 300)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="bg-muted/40 rounded-md px-3 py-2">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p
        className={cn(
          "text-foreground mt-0.5 font-medium",
          small ? "text-xs" : "text-lg"
        )}
      >
        {value}
      </p>
    </div>
  );
}
