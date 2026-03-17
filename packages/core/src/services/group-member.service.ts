import { prisma } from "@reachdem/database";
import { GroupService } from "./group.service";
import type { GetGroupContactsOptions } from "@reachdem/shared";

/** Helper for chunking large arrays */
function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
    array.slice(i * size, i * size + size)
  );
}

export class GroupMemberService {
  /**
   * Safely fetch contacts paginated via keyset cursor for a specific group
   */
  static async getGroupContacts(
    groupId: string,
    organizationId: string,
    options: GetGroupContactsOptions
  ) {
    // Enforce group identity and workspace bounds
    await GroupService.getGroupById(groupId, organizationId);

    const limit = Math.min(options.limit, 100);

    const [memberships, total] = await Promise.all([
      prisma.groupMember.findMany({
        where: {
          groupId,
          contact: {
            is: {
              deletedAt: null,
            },
          },
        },
        take: limit,
        orderBy: { addedAt: "desc" },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneE164: true,
              createdAt: true,
            },
          },
        },
        cursor: options.cursor
          ? {
              groupId_contactId: {
                groupId,
                contactId: options.cursor,
              },
            }
          : undefined,
        skip: options.cursor ? 1 : undefined,
      }),
      prisma.groupMember.count({
        where: {
          groupId,
          contact: {
            is: {
              deletedAt: null,
            },
          },
        },
      }),
    ]);

    const items = memberships.map((m) => m.contact);
    const nextCursor =
      memberships.length === limit
        ? memberships[memberships.length - 1].contactId
        : null;

    return {
      group_id: groupId,
      items,
      meta: {
        total,
        limit,
        nextCursor,
      },
    };
  }

  /**
   * Add contacts to a group in bulk, handling massive arrays and avoiding duplicates
   */
  static async addGroupMembers(
    groupId: string,
    organizationId: string,
    contactIds: string[]
  ) {
    return await prisma.$transaction(async (tx) => {
      // Verify group exists
      await tx.group.findUniqueOrThrow({
        where: { id: groupId, organizationId },
      });

      const uniqueContactIds = [...new Set(contactIds)];

      // Ensure physical ownership of all contacts
      const contactChunks = chunkArray(uniqueContactIds, 500);
      let validContactsCount = 0;

      for (const chunk of contactChunks) {
        const count = await tx.contact.count({
          where: {
            id: { in: chunk },
            organizationId,
            deletedAt: null,
          },
        });
        validContactsCount += count;
      }

      if (validContactsCount !== uniqueContactIds.length) {
        throw new Error(
          "One or more contacts are invalid or do not belong to this workspace."
        );
      }

      // Insert graceful duplicate skipping via nested chunks
      let totalInserted = 0;
      const insertData = uniqueContactIds.map((contactId) => ({
        groupId,
        contactId,
      }));
      const insertChunks = chunkArray(insertData, 500);

      for (const chunk of insertChunks) {
        const result = await tx.groupMember.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        totalInserted += result.count;
      }

      return totalInserted;
    });
  }

  /**
   * Remove contacts from a group in massive arrays, using chunking
   */
  static async removeGroupMembers(
    groupId: string,
    organizationId: string,
    contactIds: string[]
  ) {
    // Enforce group constraints natively
    await GroupService.getGroupById(groupId, organizationId);

    const uniqueContactIds = [...new Set(contactIds)];
    const contactChunks = chunkArray(uniqueContactIds, 500);
    let totalDeleted = 0;

    for (const chunk of contactChunks) {
      const result = await prisma.groupMember.deleteMany({
        where: {
          groupId,
          contactId: { in: chunk },
        },
      });
      totalDeleted += result.count;
    }

    return totalDeleted;
  }
}
