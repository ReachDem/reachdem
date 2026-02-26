"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

export function SettingsSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProfile = pathname?.includes("/profile");
  const currentPage = isProfile ? "Profile" : "Workspace";

  return (
    <>
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
          <nav className="flex flex-col gap-1 border-r pr-6 min-h-[500px]">
            <Link
              href="/settings/workspace"
              className={`px-3 py-2 rounded-md font-medium transition-colors ${!isProfile ? "bg-muted text-foreground border-l-2 border-primary" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              Workspace
            </Link>
            <Link
              href="/settings/profile"
              className={`px-3 py-2 rounded-md font-medium transition-colors ${isProfile ? "bg-muted text-foreground border-l-2 border-primary" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              Profile
            </Link>
          </nav>
          <main className="max-w-4xl pb-16">{children}</main>
        </div>
      </div>
    </>
  );
}
