import { prisma } from "@reachdem/database";
import { SegmentNode } from "@reachdem/shared";

type CreateSegmentInput = {
    organizationId: string;
    name: string;
    description?: string;
    definition: SegmentNode;
};

type UpdateSegmentInput = {
    organizationId: string;
    segmentId: string;
    name?: string;
    description?: string;
    definition?: SegmentNode;
};

export class SegmentService {
    static async getSegments(organizationId: string, limit = 50, cursor?: string) {
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
}
