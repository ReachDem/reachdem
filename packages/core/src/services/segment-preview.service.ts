import { prisma, Prisma } from "@reachdem/database";
import { compileSegmentToPrismaWhere } from "../utils/segment-compiler";

export class SegmentPreviewService {
  /**
   * Retrieve Contacts dynamically evaluated against a raw Segment definition (Dry-Run)
   */
  static async evaluateSegmentDefinition(
    organizationId: string,
    definition: SegmentNode,
    limit = 50,
    cursor?: string,
    q?: string
  ) {
    const baseWhere = compileSegmentToPrismaWhere(organizationId, definition);

    const searchWhere: Prisma.ContactWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phoneE164: { contains: q } },
          ],
        }
      : {};

    const finalWhere: Prisma.ContactWhereInput = {
      AND: [baseWhere, searchWhere],
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: finalWhere,
        take: limit,
        skip: cursor ? 1 : 0,
        ...(cursor && { cursor: { id: cursor } }),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          phoneE164: true,
          email: true,
          gender: true,
          enterprise: true,
        },
      }),
      prisma.contact.count({ where: finalWhere }),
    ]);

    return {
      items: contacts,
      meta: {
        total,
        limit,
        nextCursor:
          contacts.length === limit ? contacts[contacts.length - 1].id : null,
      },
    };
  }
}
