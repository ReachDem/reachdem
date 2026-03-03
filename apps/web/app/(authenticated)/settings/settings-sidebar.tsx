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
      <div className="container mx-auto flex-1 px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr]">
          <nav className="flex min-h-[500px] flex-col gap-1 border-r pr-6">
            <Link
              href="/settings/workspace"
              className={`rounded-md px-3 py-2 font-medium transition-colors ${!isProfile ? "bg-muted text-foreground border-primary border-l-2" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              Workspace
            </Link>
            <Link
              href="/settings/profile"
              className={`rounded-md px-3 py-2 font-medium transition-colors ${isProfile ? "bg-muted text-foreground border-primary border-l-2" : "text-muted-foreground hover:bg-muted/50"}`}
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
