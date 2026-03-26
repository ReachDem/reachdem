"use client";

import { useState } from "react";
import { Users, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  disabled?: boolean;
}

export function AudienceTargetSelector({
  segments = [],
  groups = [],
  selectedSegmentId,
  selectedGroupId,
  onSegmentChange,
  onGroupChange,
  disabled = false,
}: AudienceTargetSelectorProps) {
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const handleSegmentSelect = (segmentId: string) => {
    onSegmentChange?.(segmentId);
    // Clear group selection
    if (selectedGroupId) {
      onGroupChange?.("");
    }
  };

  const handleGroupSelect = (groupId: string) => {
    onGroupChange?.(groupId);
    // Clear segment selection
    if (selectedSegmentId) {
      onSegmentChange?.("");
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-muted-foreground text-xs font-medium">
        Target audience
      </label>

      <div className="bg-background inline-flex rounded-lg border">
        {/* Segments Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              disabled={disabled}
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
              disabled={disabled}
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
              <DropdownMenuItem disabled>No groups available</DropdownMenuItem>
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
  );
}
