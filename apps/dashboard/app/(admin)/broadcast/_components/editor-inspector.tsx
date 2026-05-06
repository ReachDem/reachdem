"use client";

import { useState } from "react";
import { Inspector } from "@react-email/editor/ui";
import "@react-email/editor/styles/inspector.css";
import { cn } from "@/lib/utils";

type Tab = "properties" | "theme";

export function EditorInspector() {
  const [tab, setTab] = useState<Tab>("properties");

  return (
    <Inspector.Root className="border-border bg-card flex h-full w-72 shrink-0 flex-col overflow-hidden border-l">
      {/* Tab header*/}
      <div className="border-border flex border-b">
        {(
          [
            { id: "properties", label: "Properties" },
            { id: "theme", label: "Theme" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "text-foreground border-primary border-b-2"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel content*/}
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {tab === "properties" ? (
          <div className="space-y-1">
            <Inspector.Node>
              {(ctx) => (
                <div className="space-y-3">
                  <Inspector.Attributes {...ctx} />
                  <Inspector.Typography {...ctx} />
                  <Inspector.Background {...ctx} />
                  <Inspector.Border {...ctx} />
                  <Inspector.Padding {...ctx} />
                  <Inspector.Size {...ctx} />
                  <Inspector.ColumnSpacing {...ctx} />
                </div>
              )}
            </Inspector.Node>
            <Inspector.Text>
              {(ctx) => (
                <div className="space-y-3">
                  <Inspector.Typography {...ctx} />
                  <Inspector.Link {...ctx} />
                </div>
              )}
            </Inspector.Text>
          </div>
        ) : (
          <Inspector.Document>
            {(ctx) => (
              <div className="space-y-4">
                {ctx.styles.map((group, gi) => (
                  <div key={group.id ?? group.title ?? gi}>
                    <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                      {group.title}
                    </p>
                    <div className="space-y-2">
                      {group.inputs.map((input, ii) => (
                        <div
                          key={`${gi}-${ii}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="text-foreground/70 text-[11px]">
                            {input.label}
                          </span>
                          <input
                            type="text"
                            value={String(
                              ctx.findStyleValue(
                                (input.classReference ?? group.classReference)!,
                                input.prop
                              ) ?? ""
                            )}
                            onChange={(e) =>
                              ctx.setGlobalStyle(
                                (input.classReference ?? group.classReference)!,
                                input.prop,
                                e.target.value
                              )
                            }
                            className="border-border bg-background text-foreground focus:ring-ring w-24 rounded border px-2 py-1 text-[11px] focus:ring-1 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Inspector.Document>
        )}
      </div>
    </Inspector.Root>
  );
}
