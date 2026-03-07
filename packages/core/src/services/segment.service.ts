import { prisma, Prisma } from "@reachdem/database";
import { compileSegmentToPrismaWhere } from "../utils/segment-compiler";
import type {
  CreateSegmentInput,
  UpdateSegmentInput,
  GetSegmentsOptions,
  SegmentNode,
} from "@reachdem/shared";

export class SegmentService {
  static async getSegments(
    organizationId: string,
    options: GetSegmentsOptions = {}
  ) {
    const limit = options.limit ?? 50;
    const cursor = options.cursor;

    const items = await prisma.segment.findMany({
      where: { organizationId },
      take: limit,
      skip: cursor ? 1 : 0,
      ...(cursor && { cursor: { id: cursor } }),
      orderBy: { createdAt: "desc" },
    });

    return {
      items,
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
    };
  }

  static async getSegmentById(organizationId: string, segmentId: string) {
    const segment = await prisma.segment.findUnique({
      where: { id: segmentId },
    });
    if (!segment || segment.organizationId !== organizationId) {
      throw new Error("Segment not found");
    }
    return segment;
  }

  static async createSegment(input: CreateSegmentInput) {
    const { organizationId, name, description, definition } = input;
    return prisma.segment.create({
      data: {
        organizationId,
        name,
        description,
        definition: definition as any,
      },
    });
  }

  static async updateSegment(input: UpdateSegmentInput) {
    const { organizationId, segmentId, name, description, definition } = input;
    const segment = await this.getSegmentById(organizationId, segmentId);
    return prisma.segment.update({
      where: { id: segment.id },
      data: {
        name,
        description,
        definition: definition ? (definition as any) : undefined,
      },
    });
  }

  static async deleteSegment(organizationId: string, segmentId: string) {
    const segment = await this.getSegmentById(organizationId, segmentId);
    await prisma.segment.delete({
      where: { id: segment.id },
    });
    return true;
  }

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
