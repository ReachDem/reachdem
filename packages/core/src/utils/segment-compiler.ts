import { Prisma } from "@reachdem/database";
import { SegmentNode, SegmentConditionNode } from "@reachdem/shared";

function compileCondition(node: SegmentConditionNode): Prisma.ContactWhereInput {
    const { field, operator, type, value } = node;

    // Dates string need to be parsed to Date object for strict equality if type is 'date'
    // but Prisma Postgres handles ISO string well in most conditions except some strict comparisons.
    // For MVP, passing value directly. Prisma's client handles type coerction.

    // Handle JSONB Custom Fields
    if (field.startsWith("custom.")) {
        const customKey = field.substring(7); // remove "custom."
        switch (operator) {
            case "eq":
                if (value === null || value === undefined) {
                    return { customFields: { path: [customKey], equals: Prisma.AnyNull } };
                }
                return { customFields: { path: [customKey], equals: value } };
            case "contains":
                return { customFields: { path: [customKey], string_contains: String(value) } };
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
            return { [field]: value };
        case "contains":
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
export function compileSegmentToPrismaWhere(
    organizationId: string,
    definition: SegmentNode
): Prisma.ContactWhereInput {
    const compileNode = (node: SegmentNode): Prisma.ContactWhereInput => {
        if ("op" in node) {
            // Logical Node (AND / OR)
            const childrenWheres = node.children.map(compileNode);
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
        deletedAt: null // ensuring we don't accidentally pull soft-deleted contacts
    };
}
