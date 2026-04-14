"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AudienceSelectorProps {
  groups: { id: string; name: string }[];
  segments: { id: string; name: string }[];
  selectedGroups: string[];
  selectedSegments: string[];
  onGroupsChange: (ids: string[]) => void;
  onSegmentsChange: (ids: string[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function AudienceSelector({
  groups,
  segments,
  selectedGroups,
  selectedSegments,
  onGroupsChange,
  onSegmentsChange,
  disabled = false,
  isLoading = false,
}: AudienceSelectorProps) {
  const handleGroupToggle = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      onGroupsChange(selectedGroups.filter((id) => id !== groupId));
    } else {
      onGroupsChange([...selectedGroups, groupId]);
    }
  };

  const handleSegmentToggle = (segmentId: string) => {
    if (selectedSegments.includes(segmentId)) {
      onSegmentsChange(selectedSegments.filter((id) => id !== segmentId));
    } else {
      onSegmentsChange([...selectedSegments, segmentId]);
    }
  };

  const handleRemoveGroup = (groupId: string) => {
    onGroupsChange(selectedGroups.filter((id) => id !== groupId));
  };

  const handleRemoveSegment = (segmentId: string) => {
    onSegmentsChange(selectedSegments.filter((id) => id !== segmentId));
  };

  const selectedGroupsData = groups.filter((g) =>
    selectedGroups.includes(g.id)
  );
  const selectedSegmentsData = segments.filter((s) =>
    selectedSegments.includes(s.id)
  );

  const hasSelections =
    selectedGroupsData.length > 0 || selectedSegmentsData.length > 0;

  return (
    <div className="space-y-4">
      {/* Selected Items Display */}
      {hasSelections && (
        <div className="space-y-3">
          <Label>Selected Audience</Label>
          <div className="border-input bg-muted/30 flex min-h-[60px] flex-wrap gap-2 rounded-md border p-3">
            {selectedGroupsData.map((group) => (
              <Badge
                key={group.id}
                variant="secondary"
                className="gap-1.5 pr-1"
              >
                <span className="text-muted-foreground text-xs">Group:</span>
                {group.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveGroup(group.id)}
                  disabled={disabled}
                  className="hover:bg-secondary-foreground/20 ml-1 h-4 w-4 rounded-full p-0"
                  aria-label={`Remove ${group.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            {selectedSegmentsData.map((segment) => (
              <Badge
                key={segment.id}
                variant="secondary"
                className="gap-1.5 pr-1"
              >
                <span className="text-muted-foreground text-xs">Segment:</span>
                {segment.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSegment(segment.id)}
                  disabled={disabled}
                  className="hover:bg-secondary-foreground/20 ml-1 h-4 w-4 rounded-full p-0"
                  aria-label={`Remove ${segment.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Selection Interface */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Groups Section */}
        <div className="space-y-3">
          <Label>Groups</Label>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <div className="border-input bg-muted/30 flex min-h-[120px] items-center justify-center rounded-md border p-4">
              <p className="text-muted-foreground text-center text-sm">
                No groups available
              </p>
            </div>
          ) : (
            <ScrollArea className="border-input h-[240px] rounded-md border">
              <div className="space-y-1 p-3">
                {groups.map((group) => (
                  <label
                    key={group.id}
                    className={cn(
                      "hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors",
                      disabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Checkbox
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={() => handleGroupToggle(group.id)}
                      disabled={disabled}
                      aria-label={`Select group ${group.name}`}
                    />
                    <span className="text-sm">{group.name}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Segments Section */}
        <div className="space-y-3">
          <Label>Segments</Label>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : segments.length === 0 ? (
            <div className="border-input bg-muted/30 flex min-h-[120px] items-center justify-center rounded-md border p-4">
              <p className="text-muted-foreground text-center text-sm">
                No segments available
              </p>
            </div>
          ) : (
            <ScrollArea className="border-input h-[240px] rounded-md border">
              <div className="space-y-1 p-3">
                {segments.map((segment) => (
                  <label
                    key={segment.id}
                    className={cn(
                      "hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors",
                      disabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Checkbox
                      checked={selectedSegments.includes(segment.id)}
                      onCheckedChange={() => handleSegmentToggle(segment.id)}
                      disabled={disabled}
                      aria-label={`Select segment ${segment.name}`}
                    />
                    <span className="text-sm">{segment.name}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
