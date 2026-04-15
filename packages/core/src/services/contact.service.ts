import { prisma, Prisma } from "@reachdem/database";
import {
  validateCustomFields,
  MAX_CUSTOM_FIELDS_PER_ORG,
} from "../utils/contact-fields";
import { compileSegmentToPrismaWhere } from "../utils/segment-compiler";
import { SegmentService } from "./segment.service";
import type {
  CreateContactInput,
  UpdateContactInput,
  GetContactsOptions,
} from "@reachdem/shared";
import { computeContactChannelFlags } from "@reachdem/shared";

export class ContactService {
  /**
   * Create a new contact
   */
  static async createContact(
    organizationId: string,
    data: CreateContactInput,
    db: Prisma.TransactionClient = prisma
  ) {
    // Validation: Must have either phone or email
    if (
      (!data.phoneE164 || data.phoneE164.length === 0) &&
      (!data.email || data.email.length === 0)
    ) {
      throw new Error(
        "A contact must have at least an email or a phone number."
      );
    }

    if (data.customFields && Object.keys(data.customFields).length > 0) {
      if (Object.keys(data.customFields).length > MAX_CUSTOM_FIELDS_PER_ORG) {
        throw new Error(
          `Maximum ${MAX_CUSTOM_FIELDS_PER_ORG} custom fields allowed per contact`
        );
      }

      const definitions = await db.contactFieldDefinition.findMany({
        where: { organizationId },
      });

      const validation = validateCustomFields(data.customFields, definitions);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
    }

    return db.contact.create({
      data: {
        ...data,
        ...computeContactChannelFlags({
          email: data.email,
          phoneE164: data.phoneE164,
        }),
        organizationId,
        customFields: data.customFields
          ? (data.customFields as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  /**
   * Bulk Create Contacts (Optimization: Bulk Operations + Unit of Work)
   */
  static async createContacts(
    organizationId: string,
    contacts: CreateContactInput[],
    db: Prisma.TransactionClient = prisma
  ) {
    if (contacts.length === 0) return { count: 0 };

    // Fetch definitions once for the whole batch
    const definitions = await db.contactFieldDefinition.findMany({
      where: { organizationId },
    });

    const validData = contacts.map((data) => {
      if (data.customFields) {
        const validation = validateCustomFields(data.customFields, definitions);
        if (!validation.isValid) throw new Error(validation.error);
      }
      return {
        ...data,
        ...computeContactChannelFlags({
          email: data.email,
          phoneE164: data.phoneE164,
        }),
        organizationId,
        customFields: data.customFields
          ? (data.customFields as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      };
    });

    // Uses createMany for bulk performance instead of N queries
    return db.contact.createMany({
      data: validData,
      skipDuplicates: true, // Graceful failure for collisions
    });
  }

  /**
   * Get Paginated Contacts List
   */
  static async getContacts(
    organizationId: string,
    options: GetContactsOptions
  ) {
    const skip = (options.page - 1) * options.limit;
    const whereClause: Prisma.ContactWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (options.q) {
      whereClause.OR = [
        { name: { contains: options.q, mode: "insensitive" } },
        { email: { contains: options.q, mode: "insensitive" } },
        { phoneE164: { contains: options.q, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.contact.findMany({
        where: whereClause,
        skip,
        take: options.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.contact.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  /**
   * Get a single contact securely
   */
  static async getContactById(id: string, organizationId: string) {
    const contact = await prisma.contact.findUnique({
      where: { id },
    });

    if (
      !contact ||
      contact.organizationId !== organizationId ||
      contact.deletedAt
    ) {
      throw new Error("Contact not found");
    }

    return contact;
  }

  /**
   * Update a contact securely
   */
  static async updateContact(
    id: string,
    organizationId: string,
    data: UpdateContactInput
  ) {
    const existingContact = await this.getContactById(id, organizationId);

    // Logic check: ensure update doesn't leave contact without routing info
    const resultingPhone =
      data.phoneE164 !== undefined ? data.phoneE164 : existingContact.phoneE164;
    const resultingEmail =
      data.email !== undefined ? data.email : existingContact.email;

    const hasResultingPhone = resultingPhone && resultingPhone.length > 0;
    const hasResultingEmail = resultingEmail && resultingEmail.length > 0;

    if (!hasResultingPhone && !hasResultingEmail) {
      throw new Error(
        "A contact must have at least an email or a phone number. You cannot remove both."
      );
    }

    if (data.customFields !== undefined && data.customFields !== null) {
      if (Object.keys(data.customFields).length > MAX_CUSTOM_FIELDS_PER_ORG) {
        throw new Error(
          `Maximum ${MAX_CUSTOM_FIELDS_PER_ORG} custom fields allowed per contact`
        );
      }

      const definitions = await prisma.contactFieldDefinition.findMany({
        where: { organizationId },
      });

      const validation = validateCustomFields(data.customFields, definitions);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
    }

    return prisma.contact.update({
      where: { id },
      data: {
        ...data,
        ...computeContactChannelFlags({
          email: resultingEmail,
          phoneE164: resultingPhone,
        }),
        customFields:
          data.customFields === undefined
            ? undefined
            : data.customFields
              ? (data.customFields as Prisma.InputJsonValue)
              : Prisma.DbNull,
      },
    });
  }

  /**
   * Soft Delete a Contact
   */
  static async deleteContact(id: string, organizationId: string) {
    await this.getContactById(id, organizationId);

    await prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return true;
  }

  /**
   * Retrieve Contacts dynamically evaluated against a Segment's definition
   */
  static async getContactsBySegment(
    organizationId: string,
    segmentId: string,
    limit = 50,
    cursor?: string,
    q?: string
  ) {
    const segment = await SegmentService.getSegmentById(
      organizationId,
      segmentId
    );

    const baseWhere = compileSegmentToPrismaWhere(
      organizationId,
      segment.definition as any
    );

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
        },
      }),
      prisma.contact.count({ where: finalWhere }),
    ]);

    return {
      items: contacts,
      total,
      nextCursor:
        contacts.length === limit ? contacts[contacts.length - 1].id : null,
    };
  }
}
