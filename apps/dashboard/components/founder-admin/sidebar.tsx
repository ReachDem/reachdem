"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuBadge,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import {
  LayoutDashboardIcon,
  UsersIcon,
  ServerCogIcon,
  ReceiptIcon,
  AppWindowIcon,
  ShieldCheckIcon,
} from "lucide-react";

interface FounderSidebarProps extends React.ComponentProps<typeof Sidebar> {
  email: string;
}

export function FounderSidebar({ email, ...props }: FounderSidebarProps) {
  const pathname = usePathname();

  const data = React.useMemo(
    () => ({
      user: {
        name: email.split("@")[0],
        email,
        avatar: "",
      },
      navMain: [
        {
          title: "Overview",
          description: "Growth, revenue, and platform health",
          url: "/overview",
          icon: LayoutDashboardIcon,
        },
        {
          title: "Customers",
          description: "Workspaces, KYB reviews, and feedback",
          url: "/customers",
          icon: UsersIcon,
        },
        {
          title: "Ops",
          description: "Queues, worker health, and incidents",
          url: "/ops",
          icon: ServerCogIcon,
        },
        {
          title: "Accounting",
          description: "Margins, reports, and channel spend",
          url: "/accounting",
          icon: ReceiptIcon,
        },
        {
          title: "Apps",
          description: "Pricing, quotas, and announcements",
          url: "/apps",
          icon: AppWindowIcon,
        },
      ],
    }),
    [email]
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-3 px-3 pt-4 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-auto rounded-2xl border border-white/8 bg-white/[0.04] p-3 data-[slot=sidebar-menu-button]:p-0"
              render={<Link href="/overview" />}
            >
              <div className="bg-primary text-primary-foreground flex aspect-square size-10 items-center justify-center rounded-2xl shadow-[0_10px_24px_rgba(245,140,66,0.35)]">
                <ShieldCheckIcon className="size-4" />
              </div>
              <div className="grid min-w-0 flex-1 gap-0.5 text-left">
                <span className="truncate text-sm font-semibold tracking-[0.01em]">
                  ReachDem Founder
                </span>
                <span className="text-sidebar-foreground/65 truncate text-xs">
                  Internal control center
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div
          data-founder-surface="tile"
          className="rounded-2xl px-3 py-3 text-sm"
        >
          <p className="text-sidebar-foreground/55 text-[0.68rem] tracking-[0.22em] uppercase">
            Founder Access
          </p>
          <p className="text-sidebar-foreground mt-2 text-sm font-medium">
            Direct access to operations, revenue, and customer risk.
          </p>
          <p className="text-sidebar-foreground/65 mt-1 text-xs leading-5">
            Collapse the rail any time with Ctrl/Cmd + B.
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Control Center</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {data.navMain.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(`${item.url}/`);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className="h-auto min-h-12 rounded-2xl px-3 py-3"
                      render={<Link href={item.url} />}
                    >
                      <Icon className="mt-0.5 size-4" />
                      <div className="grid min-w-0 flex-1 gap-0.5 text-left">
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="text-sidebar-foreground/60 truncate text-xs">
                          {item.description}
                        </span>
                      </div>
                      {isActive ? (
                        <SidebarMenuBadge>Live</SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-2 my-2" />

        <SidebarGroup className="pt-1">
          <SidebarGroupLabel>Session</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="text-sidebar-foreground/65 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-xs leading-5">
              Signed in as{" "}
              <span className="text-sidebar-foreground font-medium">
                {email}
              </span>
              .
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-2 pb-3">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
