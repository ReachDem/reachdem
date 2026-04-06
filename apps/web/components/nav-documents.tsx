"use client";

import {
  IconDots,
  IconMail,
  IconMessage,
  type Icon,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavDocuments({
  items,
  label = "Tools",
  sectionBadge,
}: {
  items: {
    name: string;
    url: string;
    icon: Icon;
    badge?: string;
    disabled?: boolean;
  }[];
  label?: string;
  sectionBadge?: string;
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <div className="flex items-center gap-1.5 px-2 pb-2">
        <SidebarGroupLabel className="h-auto px-0 py-0">
          {label}
        </SidebarGroupLabel>
        {sectionBadge ? (
          <Badge
            variant="secondary"
            className="rounded-full px-1.5 py-0 text-[9px] leading-4 tracking-[0.04em]"
          >
            {sectionBadge}
          </Badge>
        ) : null}
      </div>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild disabled={item.disabled}>
              <a
                href={item.disabled ? undefined : item.url}
                aria-disabled={item.disabled}
                onClick={
                  item.disabled
                    ? (event) => {
                        event.preventDefault();
                      }
                    : undefined
                }
                className={
                  item.disabled ? "pointer-events-none opacity-45" : ""
                }
              >
                <item.icon />
                <span>{item.name}</span>
                {item.badge ? (
                  <Badge
                    variant="secondary"
                    className="ml-auto px-1.5 py-0 text-[10px]"
                  >
                    {item.badge}
                  </Badge>
                ) : null}
              </a>
            </SidebarMenuButton>
            {!item.disabled ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction
                    id={`nav-doc-action-${item.name.replace(/\s+/g, "-").toLowerCase()}`}
                    showOnHover
                    className="data-[state=open]:bg-accent rounded-sm"
                  >
                    <IconDots />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-44 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem>
                    <IconMail />
                    <span>Email Templates</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <IconMessage />
                    <span>SMS Templates</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
