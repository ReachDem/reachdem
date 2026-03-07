"use client";

import * as React from "react";
import { type SegmentNode, type SegmentLogicalNode } from "@reachdem/shared";
import { LogicalGroup } from "./logical-group";
import { type FieldOption } from "../segment-form-wrapper";

interface QueryBuilderProps {
  value: SegmentNode;
  onChange: (value: SegmentNode) => void;
  customFields?: FieldOption[];
}

export function QueryBuilder({
  value,
  onChange,
  customFields = [],
}: QueryBuilderProps) {
  const rootNode: SegmentLogicalNode =
    "op" in value
      ? value
      : {
          op: "AND",
          children: [value],
        };

  return (
    <div className="w-full">
      <LogicalGroup
        node={rootNode}
        onChange={onChange}
        onRemove={() => {}}
        isRoot={true}
        customFields={customFields}
      />
    </div>
  );
}
