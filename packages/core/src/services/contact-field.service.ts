import { prisma, Prisma } from "@reachdem/database";
import { MAX_CUSTOM_FIELDS_PER_ORG } from "../utils/contact-fields";

export class ContactFieldService {
    /**
     * Get all contact fields for a workspace
     */
    static async getContactFields(organizationId: string) {
        return prisma.contactFieldDefinition.findMany({
            where: { organizationId },
            orderBy: { createdAt: "asc" },
        });
    }

    /**
     * Create a new custom contact field definition
     */
    static async createContactField(
        organizationId: string,
        data: {
            key: string;
            label: string;
            type: "TEXT" | "NUMBER" | "BOOLEAN" | "URL" | "DATE" | "SELECT";
            isRequired?: boolean;
            options?: string[] | null;
        }
    ) {
        // Enforce quota
        const count = await prisma.contactFieldDefinition.count({
            where: { organizationId },
        });

        if (count >= MAX_CUSTOM_FIELDS_PER_ORG) {
            throw new Error(`Maximum number of custom fields (${MAX_CUSTOM_FIELDS_PER_ORG}) reached for this workspace`);
        }

        // Enforce unique key per workspace
        const existingKey = await prisma.contactFieldDefinition.findUnique({
            where: {
                organizationId_key: {
                    organizationId,
                    key: data.key,
                },
            },
        });

        if (existingKey) {
            throw new Error("A custom field with this key already exists");
        }

        return prisma.contactFieldDefinition.create({
            data: {
                key: data.key,
                label: data.label,
                type: data.type,
                organizationId,
                options: data.options ? (data.options as Prisma.InputJsonValue) : Prisma.JsonNull,
            },
        });
    }

    /**
     * Fetch a single contact field definition securely
     */
    static async getContactFieldById(id: string, organizationId: string) {
        const field = await prisma.contactFieldDefinition.findUnique({
            where: { id },
        });

        if (!field || field.organizationId !== organizationId) {
            throw new Error("Field not found");
        }

        return field;
    }

    /**
     * Update an existing contact field definition
     */
    static async updateContactField(
        id: string,
        organizationId: string,
        data: {
            label?: string;
            isRequired?: boolean;
            options?: string[] | null;
            isActive?: boolean;
        }
    ) {
        await this.getContactFieldById(id, organizationId); // security ownership check

        return prisma.contactFieldDefinition.update({
            where: { id },
            data: {
                label: data.label,
                options: data.options === undefined ? undefined : (data.options ? (data.options as Prisma.InputJsonValue) : Prisma.DbNull),
            },
        });
    }

    /**
     * Delete a contact field definition
     */
    static async deleteContactField(id: string, organizationId: string) {
        await this.getContactFieldById(id, organizationId); // security check

        await prisma.contactFieldDefinition.delete({
            where: { id },
        });

        return true;
    }
}
