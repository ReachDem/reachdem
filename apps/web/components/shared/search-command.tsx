"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Mail,
  Users,
  BarChart3,
  Code,
  Send,
  FileText,
  Settings,
  CreditCard,
  LifeBuoy,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    heading: "Messaging",
    items: [
      { icon: MessageSquare, label: "Send SMS", href: "/campaigns/new/sms" },
      { icon: Mail, label: "Send Email", href: "/campaigns/new/email" },
      { icon: Send, label: "New Campaign", href: "/campaigns/new" },
    ],
  },
  {
    heading: "Contacts",
    items: [
      { icon: Users, label: "All Contacts", href: "/contacts" },
      { icon: Users, label: "Groups", href: "/contacts/groups" },
      { icon: Users, label: "Segments", href: "/contacts/segments" },
    ],
  },
  {
    heading: "Tools",
    items: [
      {
        icon: BarChart3,
        label: "Dashboard",
        href: "/dashboard",
      },
      { icon: FileText, label: "API Reference", href: "/api-reference" },
      { icon: Code, label: "API & Developers", href: "/api-config" },
    ],
  },
  {
    heading: "Account",
    items: [
      {
        icon: CreditCard,
        label: "Plans & Credits",
        href: "/billing",
      },
      { icon: Settings, label: "Settings", href: "/settings/workspace" },
      { icon: LifeBuoy, label: "Help Center", href: "/help" },
    ],
  },
];

export function SearchCommand() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="bg-muted/50 text-muted-foreground relative h-9 w-full justify-start rounded-md text-sm shadow-none sm:w-64 sm:pr-12"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex">Search...</span>
        <kbd className="bg-background pointer-events-none absolute top-1/2 right-1.5 hidden h-5 -translate-y-1/2 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search for pages and actions"
      >
        <CommandInput placeholder="Type to search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {navigationItems.map((group, index) => (
            <React.Fragment key={group.heading}>
              <CommandGroup heading={group.heading}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.label}
                    onSelect={() => {
                      runCommand(() => router.push(item.href));
                    }}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {index < navigationItems.length - 1 && <CommandSeparator />}
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
