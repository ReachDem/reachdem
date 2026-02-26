"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SearchCommand } from "@/components/search-command";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

export function SiteHeader() {
  const pathname = usePathname();

  let headerTitle: React.ReactNode = (
    <h1 className="text-base font-medium">Dashboard</h1>
  );

  if (pathname?.startsWith("/settings")) {
    const isProfile = pathname.includes("/profile");
    const currentPage = isProfile ? "Profile" : "Workspace";
    headerTitle = (
      <div className="flex items-center gap-2 text-sm text-foreground">
        <span className="text-muted-foreground font-normal">Settings</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-base">{currentPage}</span>
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
