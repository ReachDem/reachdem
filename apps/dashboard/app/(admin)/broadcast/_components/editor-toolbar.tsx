"use client";

import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconCode,
  IconEye,
  IconPencil,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type EditorViewMode = "editor" | "html" | "preview";
export type DeviceMode = "desktop" | "mobile";

interface Props {
  viewMode: EditorViewMode;
  deviceMode: DeviceMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  onDeviceModeChange: (mode: DeviceMode) => void;
}

export function EditorToolbar({
  viewMode,
  deviceMode,
  onViewModeChange,
  onDeviceModeChange,
}: Props) {
  return (
    <div className="border-border bg-card flex items-center justify-between border-b px-4 py-2">
      {/* View mode tabs*/}
      <div className="border-border flex items-center gap-1 rounded-md border p-0.5">
        {(
          [
            { id: "editor", label: "Editor", icon: IconPencil },
            { id: "html", label: "HTML", icon: IconCode },
            { id: "preview", label: "Preview", icon: IconEye },
          ] as { id: EditorViewMode; label: string; icon: typeof IconPencil }[]
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onViewModeChange(m.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-3 py-1 text-xs font-medium transition-colors",
              viewMode === m.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <m.icon size={13} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Device toggle*/}
      <div className="border-border flex items-center gap-1 rounded-md border p-0.5">
        <button
          type="button"
          onClick={() => onDeviceModeChange("desktop")}
          title="Desktop (600px)"
          className={cn(
            "rounded-sm p-1.5 transition-colors",
            deviceMode === "desktop"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconDeviceDesktop size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDeviceModeChange("mobile")}
          title="Mobile (375px)"
          className={cn(
            "rounded-sm p-1.5 transition-colors",
            deviceMode === "mobile"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconDeviceMobile size={16} />
        </button>
      </div>
    </div>
  );
}
