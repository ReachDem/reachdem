"use client"

import * as React from "react"
import { IconPlus } from "@tabler/icons-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

export function AddContactDrawer({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>Add Contact</DrawerTitle>
          <DrawerDescription>
            Add a new contact to your workspace. Name and at least phone or email are required.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          {/* Required fields */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="contact-name" placeholder="Full name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" type="tel" placeholder="+221 7X XXX XX XX" />
              <p className="text-[11px] text-muted-foreground">E.164 format recommended. At least phone or email is required.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" placeholder="contact@example.com" />
            </div>
          </div>

          <Separator />

          {/* Optional fields */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Optional Information</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-gender">Gender</Label>
              <Select>
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
              <Input id="contact-birthdate" type="date" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-enterprise">Enterprise</Label>
                <Input id="contact-enterprise" placeholder="Company name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-work">Job Title</Label>
                <Input id="contact-work" placeholder="e.g. CTO" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-address">Address</Label>
              <Input id="contact-address" placeholder="Full address" />
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button>
            <IconPlus className="size-4" />
            Add Contact
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
