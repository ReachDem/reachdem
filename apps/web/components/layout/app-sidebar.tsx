"use client";

import * as React from "react";
import { authClient, useSession } from "@reachdem/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  IconLayoutList,
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/layout/nav-documents";
import { NavMain } from "@/components/layout/nav-main";
import { NavSecondary } from "@/components/layout/nav-secondary";
import { NavUser } from "@/components/layout/nav-user";
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
  workspaces: [{ id: "fallback", name: "Workspace", logo: "" }],
  currentWorkspace: {
    id: "1",
    name: "Workspace",
    logo: "",
  },
  user: {
    name: "",
    email: "",
    avatar: "",
  },
  navMain: [
    {
      title: "Home",
      url: "/dashboard",
      icon: IconHome,
    },
    {
      title: "Campaigns",
      url: "/campaigns",
      icon: IconMessage,
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
      title: "Contacts",
      url: "/contacts",
      icon: IconUsersGroup,
      items: [
        {
          title: "Groups",
          url: "/contacts/groups",
          icon: IconLayoutList,
        },
        {
          title: "Segments",
          url: "/contacts/segments",
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
      disabled: true,
      badge: "Coming soon",
    },
    {
      name: "Links",
      url: "#",
      icon: IconLink,
      disabled: true,
      badge: "Coming soon",
    },
    {
      name: "API & Developers",
      url: "/api-config",
      icon: IconApi,
      disabled: false,
    },
  ],
  navSecondary: [
    {
      title: "Billing",
      url: "/billing",
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
      url: "/help",
      icon: IconHelp,
    },
  ],
};

type SidebarWorkspace = {
  id: string;
  name: string;
  logo?: string | null;
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  initialWorkspace?: SidebarWorkspace | null;
  initialWorkspaces?: SidebarWorkspace[];
};

export function AppSidebar({
  initialWorkspace = null,
  initialWorkspaces = [],
  ...props
}: AppSidebarProps) {
  const { data: session } = useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: organizations } = authClient.useListOrganizations();
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [optimisticWorkspaceId, setOptimisticWorkspaceId] = React.useState<
    string | null
  >(null);
  const [, startSwitchTransition] = React.useTransition();

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const workspaces: SidebarWorkspace[] =
    isHydrated && organizations?.length
      ? organizations.map((org: any) => ({
          id: org.id,
          name: org.name || "Workspace",
          logo: org.logo,
        }))
      : initialWorkspaces.length
        ? initialWorkspaces
        : data.workspaces;

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === optimisticWorkspaceId) ??
    (activeOrg?.id
      ? {
          id: activeOrg.id,
          name: activeOrg.name || "Workspace",
          logo: activeOrg.logo,
        }
      : null) ??
    initialWorkspace ??
    workspaces[0] ??
    data.currentWorkspace;

  const currentWorkspaceName = activeWorkspace.name || "Workspace";
  const isOrgLoading = !activeWorkspace?.id && !isHydrated;

  const userData =
    isHydrated && session?.user
      ? {
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image || data.user.avatar,
        }
      : data.user;

  const orgInitial = currentWorkspaceName
    ? currentWorkspaceName.charAt(0).toUpperCase()
    : "W";

  const handleWorkspaceSelect = React.useCallback((workspaceId: string) => {
    setOptimisticWorkspaceId(workspaceId);
    startSwitchTransition(() => {
      void authClient.organization.setActive({ organizationId: workspaceId });
    });
  }, []);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="mb-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  id="workspace-switcher-trigger"
                  className="w-full data-[slot=sidebar-menu-button]:!p-1.5"
                >
                  <div
                    className="flex flex-1 items-center gap-2"
                    aria-busy={isOrgLoading}
                  >
                    {isOrgLoading ? (
                      <span
                        className="bg-muted inline-block size-8 animate-pulse rounded-md"
                        aria-hidden="true"
                      />
                    ) : (
                      <Avatar className="size-8 rounded-md bg-white shadow">
                        <AvatarImage
                          src={activeWorkspace.logo || undefined}
                          alt={currentWorkspaceName}
                        />
                        <AvatarFallback className="rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 font-bold text-white">
                          {orgInitial}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {isOrgLoading ? (
                      <span
                        className="bg-muted inline-block h-5 w-28 animate-pulse rounded"
                        aria-label="Chargement de l'organisation"
                      />
                    ) : (
                      <span className="text-base font-semibold">
                        {currentWorkspaceName}
                      </span>
                    )}
                  </div>
                  <IconChevronDown className="text-muted-foreground size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
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
                      onSelect={() => handleWorkspaceSelect(workspace.id)}
                    >
                      <Avatar className="size-6 rounded bg-gradient-to-br from-blue-500 to-cyan-400">
                        <AvatarImage
                          src={workspace.logo || undefined}
                          alt={workspace.name || ""}
                        />
                        <AvatarFallback className="rounded bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-bold text-white">
                          {wsInitial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">
                        {workspace.name || "Workspace"}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <IconPlus className="mr-2 size-4" />
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
