"use client";

import {
  IconCirclePlusFilled,
  IconMessage,
  type Icon,
} from "@tabler/icons-react";
import Link from "next/link";

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
              className="size-8 bg-transparent group-data-[collapsible=icon]:opacity-0"
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
              <div key={item.title} className="mb-2 flex flex-col gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={item.title} asChild>
                    <a href={item.url}>
                      {item.icon && <item.icon />}
                      <span className="font-semibold">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuSub className="ml-4 flex flex-col gap-1 border-l-0 pr-0">
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url} className="h-9">
                          {subItem.icon && (
                            <subItem.icon className="text-muted-foreground mr-1 size-4" />
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
                <SidebarMenuButton tooltip={item.title} asChild>
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-auto px-1.5 py-0 text-[10px]"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
