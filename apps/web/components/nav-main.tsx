"use client";

import {
  IconCirclePlusFilled,
  IconMessage,
  type Icon,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
    badge?: string;
    items?: {
      title: string;
      url: string;
      icon?: Icon;
    }[];
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="New Campaign"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>New Campaign</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0 bg-transparent"
              variant="outline"
            >
              <IconMessage />
              <span className="sr-only">Quick SMS</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) =>
            item.items ? (
              <div key={item.title} className="flex flex-col gap-1 mb-2">
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span className="font-semibold">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuSub className="border-l-0 pr-0 ml-4 gap-1 flex flex-col">
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url} className="h-9">
                          {subItem.icon && (
                            <subItem.icon className="size-4 text-muted-foreground mr-1" />
                          )}
                          <span>{subItem.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </div>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] px-1.5 py-0"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
