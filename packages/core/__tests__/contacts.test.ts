import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContactService, ContactFieldService } from "../src";

// We'll mock the internal prisma database client so we aren't hitting a real DB in unit tests
const prismaMock = vi.hoisted(() => ({
    contact: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    contactFieldDefinition: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
    }
}));

vi.mock("@reachdem/database", () => ({
    prisma: prismaMock,
    Prisma: {
        JsonNull: "DbNull"
    }
}));

import { prisma } from "@reachdem/database";

describe("Contacts API (Core Services)", () => {
    const ORG_ID = "org_123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Contact Validators & Creation", () => {
        it("should allow creating a contact with name and phone", async () => {
            const payload = {
                name: "Test Contact",
                phoneE164: "+1234567890",
            };

            vi.mocked(prisma.contact.create).mockResolvedValue({ id: "contact-1", ...payload } as any);

            const result = await ContactService.createContact(ORG_ID, payload);

            expect(result.id).toBe("contact-1");
            expect(prisma.contact.create).toHaveBeenCalledOnce();
        });

        it("should allow creating a contact with name and email", async () => {
            const payload = {
                name: "Test Contact",
                email: "test@example.com",
            };

            vi.mocked(prisma.contact.create).mockResolvedValue({ id: "contact-2", ...payload } as any);

            const result = await ContactService.createContact(ORG_ID, payload);
            expect(result.id).toBe("contact-2");
        });

        it("should reject creating a contact without both phone and email", async () => {
            const payload = {
                name: "Test Contact",
            };

            // Directly expect the pure service method to throw the Zod Validation Error
            await expect(ContactService.createContact(ORG_ID, payload)).rejects.toThrow();
        });
    });

    describe("Contact Custom Fields", () => {
        it("should enforce maximum of 5 custom fields per organization", async () => {
            // Mock that the organization already has 5 fields
            vi.mocked(prisma.contactFieldDefinition.count).mockResolvedValue(5);

            const payload = {
                key: "new_field",
                label: "New Field",
                type: "TEXT" as const
            };

            await expect(ContactFieldService.createContactField(ORG_ID, payload)).rejects.toThrow("Maximum number of custom fields");
        });

        it("should reject contact creation if custom field type is invalid", async () => {
            // Give them a valid field
            vi.mocked(prisma.contactFieldDefinition.findMany).mockResolvedValue([
                { key: "age", type: "NUMBER", organizationId: ORG_ID } as any
            ]);

            const payload = {
                name: "John Doe",
                email: "john@doe.com",
                customFields: {
                    "age": "twenty" // Invalid type, should be number, not string
                }
            };

            await expect(ContactService.createContact(ORG_ID, payload)).rejects.toThrow("Invalid value for custom field");
        });

        it("should reject contact creation if custom field key does not exist", async () => {
            // Organization has NO custom fields
            vi.mocked(prisma.contactFieldDefinition.findMany).mockResolvedValue([]);

            const payload = {
                name: "John Doe",
                email: "john@doe.com",
                customFields: {
                    "unknown_key": "value"
                }
            };

            await expect(ContactService.createContact(ORG_ID, payload)).rejects.toThrow("not defined for this workspace");
        });
    });
});
