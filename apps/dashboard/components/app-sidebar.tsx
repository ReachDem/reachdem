"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconLayoutDashboard,
  IconChartBar,
  IconActivity,
  IconUsers,
  IconUserPlus,
  IconCreditCard,
  IconFileReport,
  IconSettings,
  IconHelpCircle,
  IconLogout,
  IconMail,
  IconChevronDown,
  IconBroadcast,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Nav definition (dash2 links, dash2 grouping) ─────────────────────────────

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/overview", icon: IconLayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: IconChartBar },
      { label: "Activity", href: "/activity", icon: IconActivity },
    ],
  },
  {
    label: "Users",
    items: [
      { label: "Directory", href: "/directory", icon: IconUsers },
      { label: "Invitations", href: "/invitations", icon: IconUserPlus },
    ],
  },
  {
    label: "Billing",
    items: [{ label: "Billing", href: "/billing", icon: IconCreditCard }],
  },
  {
    label: "Reports",
    items: [{ label: "Reports", href: "/reports", icon: IconFileReport }],
  },
];

interface AppSidebarProps {
  email?: string;
}

export function AppSidebar({ email = "" }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = email.split("@")[0]?.slice(0, 2).toUpperCase() ?? "AD";

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-screen w-60 shrink-0 flex-col border-r">
      {/* ── Workspace header ───────────────────────────────────── */}
      <div className="border-sidebar-border flex items-center gap-2.5 border-b px-4 py-2">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold">
          R
        </div>
        <span className="truncate text-sm font-semibold">ReachDem</span>
      </div>

      {/* ── Quick actions ──────────────────────────────────────── */}
      <div className="border-sidebar-border flex items-center gap-2 p-4">
        <button className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors">
          <IconBroadcast size={14} />
          Broadcast
        </button>
        <button className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-8 items-center justify-center rounded-md transition-colors">
          <IconMail size={16} />
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-sidebar-foreground/40 mb-1 px-2 text-[10px] font-semibold">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon size={16} className="shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Bottom actions ─────────────────────────────────────── */}
      <div className="border-sidebar-border space-y-0.5 border-t px-3 py-4">
        <Link
          href="/settings"
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors"
        >
          <IconSettings size={16} className="shrink-0" />
          Settings
        </Link>
        <Link
          href="/help"
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors"
        >
          <IconHelpCircle size={16} className="shrink-0" />
          Help
        </Link>
      </div>

      {/* ── User footer ────────────────────────────────────────── */}
      <div className="border-sidebar-border border-t px-3 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:bg-sidebar-accent/60 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors">
              <Avatar className="size-7">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sidebar-foreground/80 flex-1 truncate text-left text-xs">
                {email}
              </span>
              <IconChevronDown
                size={12}
                className="text-sidebar-foreground/40"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuLabel>{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <IconLogout size={14} />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
