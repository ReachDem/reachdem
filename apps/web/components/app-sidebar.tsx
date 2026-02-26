"use client";

import type * as React from "react";
import Image from "next/image";
import { authClient, useSession } from "@reachdem/auth/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  IconApi,
  IconChartBar,
  IconHome,
  IconHelp,
  IconLink,
  IconMail,
  IconMessage,
  IconBrandWhatsapp,
  IconSettings,
  IconUsersGroup,
  IconUserCircle,
  IconTemplate,
  IconCreditCard,
  IconPlus,
  IconChevronDown,
  IconFilter,
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const data = {
  workspaces: [
    { id: "2", name: "Aquarius", logo: "/aquarius-wave-logo-blue.jpg" },
  ],
  currentWorkspace: {
    id: "1",
    name: "ReachDem",
    logo: "/logo.png",
  },
  user: {
    name: "John Doe",
    email: "john@startup.com",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "Home",
      url: "#",
      icon: IconHome,
    },
    // {
    //   title: "SMS",
    //   url: "#",
    //   icon: IconMessage,
    // },
    // {
    //   title: "Email",
    //   url: "#",
    //   icon: IconMail,
    // },
    // {
    //   title: "WhatsApp",
    //   url: "#",
    //   icon: IconBrandWhatsapp,
    //   badge: "Beta",
    // },
    {
      title: "Audience",
      url: "#",
      icon: IconUsersGroup,
      items: [
        {
          title: "Contacts",
          url: "#",
          icon: IconUserCircle,
        },
        {
          title: "Segments",
          url: "#",
          icon: IconFilter,
        },
      ],
    },
  ],
  tools: [
    {
      name: "Templates",
      url: "#",
      icon: IconTemplate,
    },
    {
      name: "URL Shortener",
      url: "#",
      icon: IconLink,
    },
    {
      name: "API & Developers",
      url: "#",
      icon: IconApi,
    },
  ],
  navSecondary: [
    {
      title: "Billing",
      url: "#",
      icon: IconCreditCard,
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Settings",
      url: "/settings/workspace",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: organizations } = authClient.useListOrganizations();

  const currentWorkspaceName = activeOrg?.name || data.currentWorkspace.name;
  const currentWorkspaceLogo = activeOrg?.logo || data.currentWorkspace.logo;
  const workspaces = organizations?.length
    ? organizations.map((org: any) => ({
        id: org.id,
        name: org.name,
        logo: org.logo,
      }))
    : data.workspaces;

  const userData = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || data.user.avatar,
      }
    : data.user;

  const orgInitial = currentWorkspaceName
    ? currentWorkspaceName.charAt(0).toUpperCase()
    : "O";

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="mb-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="data-[slot=sidebar-menu-button]:!p-1.5 w-full">
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="size-8 rounded-md bg-white shadow">
                      <AvatarImage
                        src={currentWorkspaceLogo || ""}
                        alt={currentWorkspaceName}
                      />
                      <AvatarFallback className="rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 text-white font-bold">
                        {orgInitial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-base font-semibold">
                      {currentWorkspaceName}
                    </span>
                  </div>
                  <IconChevronDown className="size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-(--radix-dropdown-menu-trigger-width)"
              >
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Switch project
                </div>
                {workspaces.map((workspace: any) => {
                  const wsInitial = workspace.name
                    ? workspace.name.charAt(0).toUpperCase()
                    : "O";
                  return (
                    <DropdownMenuItem
                      key={workspace.id}
                      className="cursor-pointer gap-2"
                    >
                      <Avatar className="size-6 rounded bg-gradient-to-br from-blue-500 to-cyan-400">
                        <AvatarImage
                          src={workspace.logo || ""}
                          alt={workspace.name || ""}
                        />
                        <AvatarFallback className="rounded bg-gradient-to-br from-blue-500 to-cyan-400 text-white font-bold text-xs">
                          {wsInitial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">{workspace.name}</span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <IconPlus className="size-4 mr-2" />
                  Create a new project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.tools} label="Tools" />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}
