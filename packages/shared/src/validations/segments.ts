import { z } from "zod";

export const SegmentOperatorSchema = z.enum(["AND", "OR"]);

export const ContactStandardFieldSchema = z.enum([
  "name",
  "email",
  "phoneE164", // aligned with mapped field name in DB
  "gender",
  "birthdate",
  "city",
  "address",
  "enterprise",
  "work",
]);

export const ContactFieldSchema = z.union([
  ContactStandardFieldSchema,
  z
    .string()
    .regex(
      /^custom\.[a-zA-Z0-9_]+$/,
      "Custom fields must start with 'custom.' and contain alphanumeric key identifiers."
    ),
]);

export const ConditionOperatorSchema = z.enum([
  "eq",
  "contains",
  "in",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "is_null",
  "is_not_null",
]);

export const ConditionValueTypeSchema = z.enum([
  "string",
  "number",
  "date",
  "boolean",
]);

export const SegmentConditionNodeSchema = z.object({
  field: ContactFieldSchema,
  operator: ConditionOperatorSchema,
  type: ConditionValueTypeSchema,
  value: z.any().optional(),
});

export type SegmentConditionNode = z.infer<typeof SegmentConditionNodeSchema>;

export type SegmentLogicalNode = {
  op: "AND" | "OR";
  children: SegmentNode[];
};

export type SegmentNode = SegmentConditionNode | SegmentLogicalNode;

export const SegmentNodeSchema: z.ZodType<SegmentNode> = z.lazy(() =>
  z.union([
    SegmentConditionNodeSchema,
    z.object({
      op: SegmentOperatorSchema,
      children: z.array(SegmentNodeSchema).min(1),
    }),
  ])
);

export const createSegmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().optional(),
  definition: SegmentNodeSchema,
});

export const updateSegmentSchema = createSegmentSchema.partial();
