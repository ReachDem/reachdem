"use client";

import * as React from "react";
import { type SegmentConditionNode } from "@reachdem/shared";
import { IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type FieldOption } from "../segment-form-wrapper";

interface RuleNodeProps {
  node: SegmentConditionNode;
  onChange: (node: SegmentConditionNode) => void;
  onRemove: () => void;
  customFields?: FieldOption[];
}

// Standard fields that exist as DB columns on the Contact model
const STANDARD_FIELDS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phoneE164", label: "Phone" },
  { value: "gender", label: "Gender" },
  { value: "birthdate", label: "Birthdate" },
  { value: "address", label: "Address" },
  { value: "enterprise", label: "Enterprise" },
  { value: "work", label: "Work" },
];

const OPERATOR_OPTIONS = [
  { value: "eq", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "in", label: "In list" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
  { value: "between", label: "Between" },
  { value: "is_null", label: "Is empty" },
  { value: "is_not_null", label: "Is not empty" },
];

export function RuleNode({
  node,
  onChange,
  onRemove,
  customFields = [],
}: RuleNodeProps) {
  const isNullOp =
    node.operator === "is_null" || node.operator === "is_not_null";

  const handleFieldChange = (val: string) => {
    let newType: "string" | "number" | "date" | "boolean" = "string";

    if (val === "birthdate") newType = "date";

    // Check if custom field, infer type
    const customDef = customFields.find(
      (f) => `custom.${f.key}` === val || f.key === val
    );
    if (customDef) {
      if (customDef.type === "NUMBER") newType = "number";
      else if (customDef.type === "DATE") newType = "date";
      else if (customDef.type === "BOOLEAN") newType = "boolean";
    }

    onChange({
      ...node,
      field: val as SegmentConditionNode["field"],
      type: newType,
      operator: node.operator,
    });
  };

  return (
    <div className="bg-background flex w-full flex-wrap items-center gap-2 rounded-md border p-2 pr-1 shadow-sm transition-all sm:flex-nowrap">
      <div className="flex w-full flex-1 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        {/* Field Selection */}
        <Select value={node.field} onValueChange={handleFieldChange}>
          <SelectTrigger className="hover:bg-muted/50 h-8 min-w-[130px] flex-1 border-transparent text-xs font-medium focus:ring-0 sm:w-[180px] sm:flex-none">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-[10px] tracking-wider uppercase opacity-50">
                Standard
              </SelectLabel>
              {STANDARD_FIELDS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
            {customFields.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-[10px] tracking-wider uppercase opacity-50">
                  Custom
                </SelectLabel>
                {customFields.map((f) => (
                  <SelectItem
                    key={`custom.${f.key}`}
                    value={`custom.${f.key}`}
                    className="text-xs"
                  >
                    {f.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>

        {/* Operator Selection */}
        <Select
          value={node.operator}
          onValueChange={(val) =>
            onChange({
              ...node,
              operator: val as SegmentConditionNode["operator"],
              value: val.includes("null") ? undefined : node.value,
            })
          }
        >
          <SelectTrigger className="bg-muted/30 hover:bg-muted/50 h-8 min-w-[120px] flex-1 border-transparent text-xs focus:ring-0 sm:w-[140px] sm:flex-none">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            {OPERATOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Input */}
        {!isNullOp && (
          <div className="min-w-[120px] flex-1 sm:max-w-xs">
            {node.type === "date" ? (
              <Input
                type="date"
                value={node.value || ""}
                onChange={(e) => onChange({ ...node, value: e.target.value })}
                className="h-8 text-xs focus-visible:ring-1"
                placeholder="Select date..."
              />
            ) : node.type === "number" ? (
              <Input
                type="number"
                value={node.value || ""}
                onChange={(e) =>
                  onChange({ ...node, value: Number(e.target.value) })
                }
                className="h-8 text-xs focus-visible:ring-1"
                placeholder="Enter number..."
              />
            ) : (
              <Input
                type="text"
                value={node.value || ""}
                onChange={(e) => onChange({ ...node, value: e.target.value })}
                className="h-8 text-xs focus-visible:ring-1"
                placeholder="Enter value..."
              />
            )}
          </div>
        )}
      </div>

      {/* Remove Rule Action */}
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto size-8 shrink-0 sm:ml-0"
        onClick={onRemove}
        title="Remove rule"
      >
        <IconTrash className="size-4" />
      </Button>
    </div>
  );
}
