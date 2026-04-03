"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
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
  const data = {
    user: {
      name: email.split("@")[0],
      email: email,
      avatar: "", // Handled by NavUser fallback
    },
    navMain: [
      {
        title: "Overview",
        url: "/overview",
        icon: <LayoutDashboardIcon />,
      },
      {
        title: "Customers",
        url: "/customers",
        icon: <UsersIcon />,
      },
      {
        title: "Ops",
        url: "/ops",
        icon: <ServerCogIcon />,
      },
      {
        title: "Accounting",
        url: "/accounting",
        icon: <ReceiptIcon />,
      },
      {
        title: "Apps",
        url: "/apps",
        icon: <AppWindowIcon />,
      },
    ],
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/overview" />}
            >
              <div className="bg-primary text-primary-foreground flex aspect-square size-5 items-center justify-center rounded-md">
                <ShieldCheckIcon className="size-3.5" />
              </div>
              <span className="text-base font-semibold">ReachDem Admin</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* We omitted NavSecondary to keep it minimal for founders */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
