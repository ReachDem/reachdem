"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmailEditorPanel } from "./email-editor-panel";
import { SmsEditorPanel } from "./sms-editor-panel";

type Tab = "email" | "sms";

interface Props {
  adminEmail: string;
}

export function BroadcastTabs({ adminEmail }: Props) {
  const [tab, setTab] = useState<Tab>("email");

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar*/}
      <div className="border-border flex w-fit gap-0 rounded-lg border p-1">
        {(
          [
            { id: "email", label: "Email" },
            { id: "sms", label: "SMS / WhatsApp" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel*/}
      {tab === "email" ? (
        <EmailEditorPanel adminEmail={adminEmail} />
      ) : (
        <div className="max-w-2xl">
          <SmsEditorPanel adminEmail={adminEmail} />
        </div>
      )}
    </div>
  );
}
