"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SearchCommand } from "@/components/search-command";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname } from "next/navigation";
import { Bot, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HermesDrawer } from "@/components/hermes/hermes-drawer";

import Link from "next/link";
import React from "react";
import { useGroupsStore } from "@/lib/stores/groups-store";
import { getGroupById } from "@/app/actions/groups";
import type { Group } from "@/lib/api/groups";

function formatBreadcrumbPart(part: string, groups: Group[]) {
  const map: Record<string, string> = {
    settings: "Settings",
    profile: "Profile",
    workspace: "Workspace",
    contacts: "Contacts",
    groups: "Groups",
    edit: "Edit",
  };

  if (map[part]) return map[part];
  if (part.length >= 20) {
    const group = groups.find((g) => g.id === part);
    return group ? group.name : "Detail";
  }
  return part.charAt(0).toUpperCase() + part.slice(1);
}

export function SiteHeader() {
  const pathname = usePathname();
  const parts = pathname?.split("/").filter(Boolean) || [];
  const [aiOpen, setAiOpen] = React.useState(false);

  const groups = useGroupsStore((s) => s.groups);
  const addGroup = useGroupsStore((s) => s.addGroup);

  // Fetch the group name if we landed directly on a detail page and the store is empty
  React.useEffect(() => {
    const idPart = parts.find((p) => p.length >= 20);
    if (idPart && !groups.find((g) => g.id === idPart)) {
      getGroupById(idPart)
        .then((group) => {
          if (group) {
            addGroup({
              ...group,
              createdAt: group.createdAt.toISOString(),
              updatedAt: group.updatedAt.toISOString(),
            });
          }
        })
        .catch(() => {});
    }
  }, [parts, groups, addGroup]);

  let headerTitle: React.ReactNode;

  if (parts.length === 0) {
    headerTitle = <h1 className="text-base font-medium">Dashboard</h1>;
  } else {
    headerTitle = (
      <div className="text-foreground flex items-center gap-2 text-sm">
        {parts.map((part, index) => {
          const isLast = index === parts.length - 1;
          const href = "/" + parts.slice(0, index + 1).join("/");
          const label = formatBreadcrumbPart(part, groups);

          return (
            <React.Fragment key={href}>
              {isLast ? (
                <span className="text-base font-medium">{label}</span>
              ) : (
                <>
                  <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
                  >
                    {label}
                  </Link>
                  <ChevronRight className="text-muted-foreground h-4 w-4" />
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {headerTitle}
        <div className="ml-auto flex items-center gap-2">
          <SearchCommand />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Open AI assistant"
            onClick={() => setAiOpen(true)}
          >
            <Bot className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
        <HermesDrawer open={aiOpen} onOpenChange={setAiOpen} />
      </div>
    </header>
  );
}
