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
import { TipsCard } from "@/components/onboarding/tips-card";
import { getTipContent } from "@/components/onboarding/tips-engine";

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
              <div key={item.title} className="flex flex-col gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={item.title} asChild>
                    <a href={item.url}>
                      {item.icon && <item.icon />}
                      <span className="font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuSub className="ml-4 flex flex-col border-l-0 pr-0">
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a
                          href={subItem.url}
                          className="h-9"
                          id={
                            subItem.url === "/contacts/groups"
                              ? "contacts-groups-nav"
                              : undefined
                          }
                        >
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
              <SidebarMenuItem key={item.title} className="relative">
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

                {item.title === "Campaigns" && (
                  <TipsCard
                    tipId="step3"
                    title={getTipContent("step3").title}
                    description={getTipContent("step3").description}
                    position="right"
                  />
                )}
                {item.title === "Contacts" && (
                  <TipsCard
                    tipId="step2"
                    title={getTipContent("step2").title}
                    description={getTipContent("step2").description}
                    position="right"
                  />
                )}
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
