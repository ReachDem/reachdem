"use client";

import * as React from "react";
import { IconPlus, IconLoader2 } from "@tabler/icons-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useContactsStore } from "@/lib/stores/contacts-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export function AddContactDrawer({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const addContact = useContactsStore((s) => s.addContact);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);

      const payload = {
        name: formData.get("name"),
        phoneE164: formData.get("phone") || undefined,
        email: formData.get("email") || undefined,
        gender: formData.get("gender") || undefined,
        birthdate: formData.get("birthdate") || undefined,
        enterprise: formData.get("enterprise") || undefined,
        work: formData.get("work") || undefined,
        address: formData.get("address") || undefined,
      };

      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add contact");
      }

      addContact(json.data);
      toast.success("Contact added successfully");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add contact");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={open}
      onOpenChange={setOpen}
    >
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <form
          onSubmit={onSubmit}
          className="flex h-full flex-col overflow-hidden"
        >
          <DrawerHeader className="shrink-0 gap-1">
            <DrawerTitle>Add Contact</DrawerTitle>
            <DrawerDescription>
              Add a new contact to your workspace. Name and at least phone or
              email are required.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
            {/* Required fields */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-name"
                  name="name"
                  placeholder="Full name"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  placeholder="+221 7X XXX XX XX"
                  disabled={isLoading}
                />
                <p className="text-muted-foreground text-[11px]">
                  E.164 format recommended. At least phone or email is required.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  placeholder="contact@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Separator />

            {/* Optional fields */}
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Optional Information
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-gender">Gender</Label>
                <Select name="gender" disabled={isLoading}>
                  <SelectTrigger id="contact-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="unknown">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-birthdate">Birthdate</Label>
                <Input
                  id="contact-birthdate"
                  name="birthdate"
                  type="date"
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contact-enterprise">Enterprise</Label>
                  <Input
                    id="contact-enterprise"
                    name="enterprise"
                    placeholder="Company name"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contact-work">Job Title</Label>
                  <Input
                    id="contact-work"
                    name="work"
                    placeholder="e.g. CTO"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-address">Address</Label>
                <Input
                  id="contact-address"
                  name="address"
                  placeholder="Full address"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
          <DrawerFooter className="mt-auto shrink-0">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconPlus className="size-4" />
              )}
              Add Contact
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
