import { prisma, Prisma } from "@reachdem/database";
import type {
  CreateGroupInput,
  UpdateGroupInput,
  GetGroupsOptions,
} from "@reachdem/shared";

export class GroupService {
  /**
   * Create a new contact group within an organization
   */
  static async createGroup(organizationId: string, data: CreateGroupInput) {
    // Enforce case-insensitive unique name constraint within the workspace
    const existingName = await prisma.group.findFirst({
      where: {
        organizationId,
        name: {
          equals: data.name,
          mode: "insensitive",
        },
      },
    });

    if (existingName) {
      throw new Error(
        `A group with the name "${data.name}" already exists in this workspace.`
      );
    }

    return prisma.group.create({
      data: {
        ...data,
        organizationId,
      },
    });
  }

  /**
   * Get paginated contact groups
   */
  static async getGroups(organizationId: string, options: GetGroupsOptions) {
    const limit = Math.min(options.limit, 100);

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where: { organizationId },
        take: limit,
        orderBy: { createdAt: "desc" },
        cursor: options.cursor ? { id: options.cursor } : undefined,
        skip: options.cursor ? 1 : undefined,
        include: {
          _count: {
            select: { members: true },
          },
        },
      }),
      prisma.group.count({ where: { organizationId } }),
    ]);

    const nextCursor =
      groups.length === limit ? groups[groups.length - 1].id : null;

    return {
      data: groups,
      meta: {
        total,
        limit,
        nextCursor,
      },
    };
  }

  /**
   * Get a single group securely
   */
  static async getGroupById(id: string, organizationId: string) {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      throw new Error("Group not found");
    }

    if (group.organizationId !== organizationId) {
      throw new Error("Unauthorized to access this group");
    }

    return group;
  }

  /**
   * Update an existing group
   */
  static async updateGroup(
    id: string,
    organizationId: string,
    data: UpdateGroupInput
  ) {
    const group = await this.getGroupById(id, organizationId);

    if (
      data.name &&
      data.name.trim().toLowerCase() !== group.name.toLowerCase()
    ) {
      const existingName = await prisma.group.findFirst({
        where: {
          organizationId,
          name: {
            equals: data.name,
            mode: "insensitive",
          },
        },
      });

      if (existingName) {
        throw new Error(
          `A group with the name "${data.name}" already exists in this workspace.`
        );
      }
    }

    return prisma.group.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a group
   */
  static async deleteGroup(id: string, organizationId: string) {
    await this.getGroupById(id, organizationId); // security check

    await prisma.group.delete({
      where: { id },
    });

    return true;
  }
}
