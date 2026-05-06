"use client";

import { useState, useTransition } from "react";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import {
  setMaintenanceMode,
  type MaintenanceState,
} from "../_actions/maintenance";
import { cn } from "@/lib/utils";

interface Props {
  initial: MaintenanceState;
}

export function MaintenanceToggle({ initial }: Props) {
  const [state, setState] = useState<MaintenanceState>(initial);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(patch: Partial<MaintenanceState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function handleToggle() {
    const next = { ...state, enabled: !state.enabled };
    setState(next);
    save(next);
  }

  function save(s: MaintenanceState = state) {
    setSaved(false);
    startTransition(async () => {
      await setMaintenanceMode(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="border-border bg-card space-y-4 rounded-xl border p-5">
      {/* Header + toggle*/}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <IconAlertTriangle
            size={18}
            className={cn(
              state.enabled ? "text-amber-500" : "text-muted-foreground"
            )}
          />
          <div>
            <p className="text-foreground text-sm font-semibold">
              Maintenance mode
            </p>
            <p className="text-muted-foreground text-xs">
              Control platform availability for all users
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.enabled}
          disabled={isPending}
          onClick={handleToggle}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none disabled:opacity-60",
            state.enabled ? "bg-amber-500" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
              state.enabled ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {/* Mode selector*/}
      <div className="flex gap-3">
        {(
          [
            {
              id: "full",
              label: "Full maintenance",
              desc: "Redirect all users to maintenance page",
            },
            {
              id: "banner",
              label: "Banner only",
              desc: "Show a dismissible warning banner",
            },
          ] as { id: MaintenanceState["mode"]; label: string; desc: string }[]
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => update({ mode: m.id })}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-left transition-colors",
              state.mode === m.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <p className="text-foreground text-xs font-medium">{m.label}</p>
            <p className="text-muted-foreground mt-0.5 text-[10px]">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Message*/}
      <div>
        <label className="text-foreground/70 mb-1 block text-xs font-medium">
          {state.mode === "banner" ? "Banner message" : "Maintenance message"}
        </label>
        <input
          type="text"
          value={state.message}
          onChange={(e) => update({ message: e.target.value })}
          placeholder={
            state.mode === "banner"
              ? "We're under maintenance — big changes are coming!"
              : "We'll be right back"
          }
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full min-w-0 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
        />
      </div>

      {/* Banner-specific fields*/}
      {state.mode === "banner" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-foreground/70 mb-1 block text-xs font-medium">
              Link URL (optional)
            </label>
            <input
              type="url"
              value={state.bannerLink ?? ""}
              onChange={(e) => update({ bannerLink: e.target.value })}
              placeholder="https://..."
              className="border-input bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="text-foreground/70 mb-1 block text-xs font-medium">
              Link text
            </label>
            <input
              type="text"
              value={state.bannerLinkText ?? "Learn more"}
              onChange={(e) => update({ bannerLinkText: e.target.value })}
              className="border-input bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Save button*/}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => save()}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saved ? <IconCheck size={14} /> : null}
          {saved ? "Saved" : "Save settings"}
        </button>
        {state.enabled && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <IconAlertTriangle size={12} />
            {state.mode === "full" ? "Platform offline" : "Banner active"}
          </span>
        )}
      </div>
    </div>
  );
}
