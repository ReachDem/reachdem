"use client";

import { Users, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContactPicker, type PickedContact } from "./contact-picker";
import { cn } from "@/lib/utils";

type TargetType = "segment" | "group" | null;

interface Segment {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
}

interface AudienceTargetSelectorProps {
  segments?: Segment[];
  groups?: Group[];
  selectedSegmentId?: string;
  selectedGroupId?: string;
  onSegmentChange?: (segmentId: string) => void;
  onGroupChange?: (groupId: string) => void;
  selectedContacts?: PickedContact[];
  onContactsChange?: (contacts: PickedContact[]) => void;
  disabled?: boolean;
}

export function AudienceTargetSelector({
  segments = [],
  groups = [],
  selectedSegmentId,
  selectedGroupId,
  onSegmentChange,
  onGroupChange,
  selectedContacts = [],
  onContactsChange,
  disabled = false,
}: AudienceTargetSelectorProps) {
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const hasManualContacts = selectedContacts.length > 0;
  const hasGroupOrSegment = !!selectedSegmentId || !!selectedGroupId;

  const handleSegmentSelect = (segmentId: string) => {
    onSegmentChange?.(segmentId);
    if (selectedGroupId) {
      onGroupChange?.("");
    }
    if (hasManualContacts) {
      onContactsChange?.([]);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    onGroupChange?.(groupId);
    if (selectedSegmentId) {
      onSegmentChange?.("");
    }
    if (hasManualContacts) {
      onContactsChange?.([]);
    }
  };

  const handleContactsChange = (contacts: PickedContact[]) => {
    onContactsChange?.(contacts);
    if (contacts.length > 0) {
      if (selectedSegmentId) onSegmentChange?.("");
      if (selectedGroupId) onGroupChange?.("");
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex justify-end">
        <div className="bg-background inline-flex rounded-lg border">
          {/* Segments Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                disabled={disabled || hasManualContacts}
                className={cn(
                  "gap-2 rounded-r-none border-r",
                  selectedSegmentId && "bg-accent"
                )}
              >
                <Filter className="h-4 w-4" />
                {selectedSegment ? selectedSegment.name : "Segments"}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {segments.length === 0 ? (
                <DropdownMenuItem disabled>
                  No segments available
                </DropdownMenuItem>
              ) : (
                segments.map((segment) => (
                  <DropdownMenuItem
                    key={segment.id}
                    onClick={() => handleSegmentSelect(segment.id)}
                    className={cn(
                      selectedSegmentId === segment.id && "bg-accent"
                    )}
                  >
                    {segment.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Groups Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                disabled={disabled || hasManualContacts}
                className={cn(
                  "gap-2 rounded-l-none",
                  selectedGroupId && "bg-accent"
                )}
              >
                <Users className="h-4 w-4" />
                {selectedGroup ? selectedGroup.name : "Groups"}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {groups.length === 0 ? (
                <DropdownMenuItem disabled>
                  No groups available
                </DropdownMenuItem>
              ) : (
                groups.map((group) => (
                  <DropdownMenuItem
                    key={group.id}
                    onClick={() => handleGroupSelect(group.id)}
                    className={cn(selectedGroupId === group.id && "bg-accent")}
                  >
                    {group.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Separator */}
      <div className="flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs tracking-wide uppercase">
          or select individual contacts
        </span>
        <div className="bg-border h-px flex-1" />
      </div>

      {/* Contact Picker */}
      <ContactPicker
        selectedContacts={selectedContacts}
        onContactsChange={handleContactsChange}
        disabled={disabled || hasGroupOrSegment}
      />
    </div>
  );
}
