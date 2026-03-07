"use client";

import * as React from "react";
import {
  type SegmentLogicalNode,
  type SegmentNode,
  type SegmentConditionNode,
} from "@reachdem/shared";
import { IconPlus, IconTrash, IconFolderPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { RuleNode } from "./rule-node";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type FieldOption } from "../segment-form-wrapper";

interface LogicalGroupProps {
  node: SegmentLogicalNode;
  onChange: (node: SegmentLogicalNode) => void;
  onRemove: () => void;
  isRoot?: boolean;
  customFields?: FieldOption[];
}

export function LogicalGroup({
  node,
  onChange,
  onRemove,
  isRoot = false,
  customFields = [],
}: LogicalGroupProps) {
  const handleOpChange = (value: "AND" | "OR") => {
    if (value) {
      onChange({ ...node, op: value });
    }
  };

  const updateChild = (index: number, newChild: SegmentNode) => {
    const newChildren = [...node.children];
    newChildren[index] = newChild;
    onChange({ ...node, children: newChildren });
  };

  const removeChild = (index: number) => {
    const newChildren = [...node.children];
    newChildren.splice(index, 1);
    onChange({ ...node, children: newChildren });
  };

  const addRule = () => {
    const newRule: SegmentConditionNode = {
      field: "name",
      operator: "eq",
      type: "string",
      value: "",
    };
    onChange({ ...node, children: [...node.children, newRule] });
  };

  const addGroup = () => {
    const newGroup: SegmentLogicalNode = {
      op: "AND",
      children: [],
    };
    onChange({ ...node, children: [...node.children, newGroup] });
  };

  const isAnd = node.op === "AND";

  return (
    <div
      className={`relative rounded-lg p-4 transition-all ${isRoot ? "bg-transparent" : "bg-muted/30 border-border/50 mt-4 border"}`}
    >
      {/* ── Group Header (AND/OR Toggle & Actions) ── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={node.op}
            onValueChange={(val) => handleOpChange(val as "AND" | "OR")}
            className="bg-background h-8 rounded-md border p-0.5"
          >
            <ToggleGroupItem
              value="AND"
              aria-label="Toggle AND"
              className={`h-6 px-3 text-xs font-semibold ${isAnd ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" : ""}`}
            >
              AND
            </ToggleGroupItem>
            <ToggleGroupItem
              value="OR"
              aria-label="Toggle OR"
              className={`h-6 px-3 text-xs font-semibold ${!isAnd ? "bg-amber-100 text-amber-700 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-900 dark:text-amber-300" : ""}`}
            >
              OR
            </ToggleGroupItem>
          </ToggleGroup>

          <span className="text-muted-foreground hidden text-xs sm:inline-block">
            {isAnd
              ? "Matches ALL of the following rules"
              : "Matches ANY of the following rules"}
          </span>
        </div>

        {!isRoot && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-7"
            onClick={onRemove}
            title="Remove group"
          >
            <IconTrash className="size-4" />
          </Button>
        )}
      </div>

      {/* ── Children (Rules & Subgroups) ── */}
      <div className="flex flex-col gap-3 pl-2 sm:pl-4">
        {/* Vertical indentation line connecting children */}
        <div
          className={`absolute top-[52px] bottom-14 left-[20px] w-px sm:left-[28px] ${isAnd ? "bg-indigo-500/20" : "bg-amber-500/20"} z-0`}
        />

        {node.children.map((child, index) => {
          return (
            <div
              key={index}
              className="relative z-10 flex w-full items-start gap-3"
            >
              {/* Joiner arm */}
              <div
                className={`mt-5 h-px w-4 shrink-0 sm:w-6 ${isAnd ? "bg-indigo-500/20" : "bg-amber-500/20"}`}
              />

              <div className="min-w-0 flex-1">
                {"op" in child ? (
                  <LogicalGroup
                    node={child}
                    onChange={(newChild) => updateChild(index, newChild)}
                    onRemove={() => removeChild(index)}
                    customFields={customFields}
                  />
                ) : (
                  <RuleNode
                    node={child}
                    onChange={(newChild) => updateChild(index, newChild)}
                    onRemove={() => removeChild(index)}
                    customFields={customFields}
                  />
                )}
              </div>
            </div>
          );
        })}

        {node.children.length === 0 && (
          <div className="text-muted-foreground py-2 pl-8 text-sm italic opacity-60 sm:pl-12">
            No rules defined yet.
          </div>
        )}

        {/* ── Add Buttons for this group ── */}
        <div className="relative z-10 mt-2 flex items-center gap-2 pl-4 sm:pl-10">
          <Button
            variant="outline"
            size="sm"
            onClick={addRule}
            className="h-8 gap-1.5 text-xs shadow-sm"
          >
            <IconPlus className="size-3.5" />
            Add rule
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={addGroup}
            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 text-xs"
          >
            <IconFolderPlus className="size-3.5" />
            Add subgroup
          </Button>
        </div>
      </div>
    </div>
  );
}
