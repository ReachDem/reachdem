"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/overview": {
    title: "Overview",
    description:
      "Track platform momentum, revenue posture, and health signals.",
  },
  "/customers": {
    title: "Customers",
    description: "Review workspaces, identity submissions, and feedback loops.",
  },
  "/ops": {
    title: "Ops",
    description:
      "Watch queues, incidents, worker status, and delivery quality.",
  },
  "/accounting": {
    title: "Accounting",
    description:
      "Monitor collected revenue, message costs, and reporting outputs.",
  },
  "/apps": {
    title: "Apps",
    description:
      "Adjust plan configuration, quotas, and in-product announcements.",
  },
};

export function FounderHeader() {
  const pathname = usePathname();
  const meta = Object.entries(PAGE_META).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? {
    title: "ReachDem Admin",
    description: "Founder-only workspace for operations and control.",
  };

  return (
    <header className="sticky top-0 z-20 flex shrink-0 items-center px-4 pt-4 md:px-6 md:pt-5 xl:px-8">
      <div className="flex h-auto w-full items-start gap-3 rounded-[26px] border border-white/8 bg-[rgba(10,14,22,0.72)] px-3 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <SidebarTrigger className="mt-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.68rem] tracking-[0.26em] text-[color:var(--founder-quiet-foreground)] uppercase">
              Founder Admin
            </p>
            <Badge
              variant="outline"
              className="rounded-full border-emerald-400/25 bg-emerald-400/10 text-[0.68rem] tracking-[0.2em] text-emerald-200 uppercase"
            >
              Secure Session
            </Badge>
          </div>

          <div className="mt-2 flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-balance md:text-xl">
                {meta.title}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--founder-muted-foreground)]">
                {meta.description}
              </p>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-[color:var(--founder-muted-foreground)]">
                Sidebar shortcut
                <span className="text-foreground ml-2 font-medium">
                  Ctrl/Cmd + B
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
