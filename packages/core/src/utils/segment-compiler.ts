import { Prisma } from "@reachdem/database";
import { SegmentNode, SegmentConditionNode } from "@reachdem/shared";

function compileCondition(
  node: SegmentConditionNode
): Prisma.ContactWhereInput {
  const { field, operator, type, value } = node;

  const STANDARD_DB_FIELDS = [
    "name",
    "email",
    "phoneE164",
    "gender",
    "birthdate",
    "address",
    "enterprise",
    "work",
  ];

  // Handle JSONB Custom Fields (or fields strictly not in the DB schema)
  if (field.startsWith("custom.") || !STANDARD_DB_FIELDS.includes(field)) {
    const customKey = field.startsWith("custom.") ? field.substring(7) : field;
    switch (operator) {
      case "eq":
        if (value === null || value === undefined) {
          return {
            customFields: { path: [customKey], equals: Prisma.AnyNull },
          };
        }
        return { customFields: { path: [customKey], equals: value } };
      case "contains":
        return {
          customFields: { path: [customKey], string_contains: String(value) },
        };
      case "is_null":
        return { customFields: { path: [customKey], equals: Prisma.AnyNull } };
      case "is_not_null":
        return { customFields: { path: [customKey], not: Prisma.AnyNull } };
      default:
        // Other advanced numeric/date operators need raw SQL for JSON in Prisma
        return {};
    }
  }

  // Handle Standard Fields
  switch (operator) {
    case "eq":
      if (value === null || value === undefined) return { [field]: null };
      if (field === "gender" && typeof value === "string") {
        const search = value.toUpperCase();
        return ["UNKNOWN", "MALE", "FEMALE", "OTHER"].includes(search)
          ? { gender: search as any }
          : { id: "00000000-0000-0000-0000-000000000000" };
      }
      return { [field]: value };
    case "contains":
      if (field === "gender" && typeof value === "string") {
        const search = value.toUpperCase();
        const matches = ["UNKNOWN", "MALE", "FEMALE", "OTHER"].filter((g) =>
          g.includes(search)
        );
        return matches.length > 0
          ? { gender: { in: matches as any[] } }
          : { id: "00000000-0000-0000-0000-000000000000" };
      }
      return { [field]: { contains: String(value), mode: "insensitive" } };
    case "in":
      return { [field]: { in: Array.isArray(value) ? value : [value] } };
    case "gt":
      return { [field]: { gt: value } };
    case "gte":
      return { [field]: { gte: value } };
    case "lt":
      return { [field]: { lt: value } };
    case "lte":
      return { [field]: { lte: value } };
    case "between":
      if (Array.isArray(value) && value.length === 2) {
        return { [field]: { gte: value[0], lte: value[1] } };
      }
      return {}; // fallback
    case "is_null":
      return { [field]: null };
    case "is_not_null":
      return { [field]: { not: null } };
    default:
      return {};
  }
}

/**
 * Compiles a Segment JSON definition into a secure Prisma Query (WhereInput).
 * Automatically scopes the query to the provided organizationId to prevent Cross-Workspace leakage.
 */
const MAX_COMPILE_DEPTH = 10;

export function compileSegmentToPrismaWhere(
  organizationId: string,
  definition: SegmentNode
): Prisma.ContactWhereInput {
  const compileNode = (
    node: SegmentNode,
    depth = 0
  ): Prisma.ContactWhereInput => {
    if (depth > MAX_COMPILE_DEPTH) {
      throw new Error("Segment definition exceeds maximum nesting depth");
    }

    if ("op" in node) {
      // Logical Node (AND / OR)
      const childrenWheres = node.children.map((child) =>
        compileNode(child, depth + 1)
      );
      if (node.op === "AND") {
        return { AND: childrenWheres };
      } else if (node.op === "OR") {
        return { OR: childrenWheres };
      }
    }

    // Base Condition Node
    return compileCondition(node as SegmentConditionNode);
  };

  const compiledDefinition = compileNode(definition);

  // CRITICAL: Always Enforce Workspace Scope at the absolute Root Level
  return {
    organizationId,
    AND: [compiledDefinition],
    deletedAt: null, // ensuring we don't accidentally pull soft-deleted contacts
  };
}
