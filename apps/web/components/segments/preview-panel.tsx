"use client";

import * as React from "react";
import { type Contact } from "@/lib/api/segments";

import {
  IconUsers,
  IconAlertCircle,
  IconSearch as Search,
} from "@tabler/icons-react";

interface PreviewPanelProps {
  contacts: Contact[];
  total: number;
  isLoading: boolean;
  error: string | null;
  hasPreviewed: boolean;
}

export function PreviewPanel({
  contacts,
  total,
  isLoading,
  error,
  hasPreviewed,
}: PreviewPanelProps) {
  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Header */}
      <div className="bg-card flex h-14 shrink-0 items-center justify-between border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Search className="size-4" />
          Preview
        </h3>
        {hasPreviewed && !error && (
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="text-muted-foreground text-xs">Loading...</div>
            ) : (
              <div className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold">
                <span>{total}</span>
                <span className="font-medium opacity-80">matches</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative overflow-y-auto">
        {!hasPreviewed && !isLoading ? (
          <div className="text-muted-foreground flex min-h-[200px] flex-col items-center justify-center px-4 text-center opacity-60">
            <IconUsers className="mb-3 size-10 opacity-20" />
            <p className="text-sm">
              Click Preview to see contacts matching these filters.
            </p>
          </div>
        ) : error ? (
          <div className="text-destructive flex flex-col items-center justify-center p-4 text-center">
            <IconAlertCircle className="mb-2 size-8 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        ) : contacts.length === 0 && !isLoading ? (
          <div className="text-muted-foreground flex h-[200px] flex-col items-center justify-center px-4 text-center">
            <p className="text-sm">No contacts match the current criteria.</p>
          </div>
        ) : (
          <div
            className="transition-opacity duration-300"
            style={{ opacity: isLoading ? 0.5 : 1 }}
          >
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 text-muted-foreground sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">
                    Enterprise
                  </th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="max-w-[140px] truncate px-3 py-2.5 font-medium">
                      {contact.name}
                    </td>
                    <td className="text-muted-foreground hidden max-w-[120px] truncate px-3 py-2.5 sm:table-cell">
                      {contact.enterprise || "–"}
                    </td>
                    <td className="text-muted-foreground max-w-[120px] truncate px-3 py-2.5">
                      {contact.phoneE164 || "–"}
                    </td>
                    <td className="text-muted-foreground hidden max-w-[140px] truncate px-3 py-2.5 sm:table-cell">
                      {contact.email || "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {total > contacts.length && (
              <div className="border-t py-2 text-center">
                <span className="text-muted-foreground text-xs">
                  and {total - contacts.length} more...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
