import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Better Auth
vi.mock("@reachdem/auth", () => {
    return {
        auth: {
            api: {
                getSession: vi.fn(),
            }
        }
    };
});

// Mock Next.js headers
vi.mock("next/headers", () => ({
    headers: vi.fn().mockResolvedValue(new Map()),
}));

// Mock Prisma
const prismaMock = vi.hoisted(() => ({
    contactFieldDefinition: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
    },
    contact: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
    }
}));

vi.mock("@reachdem/database", () => {
    return {
        prisma: prismaMock
    }
});

import { POST as createContactHandler } from "../app/api/v1/contacts/route";
import { POST as createContactFieldHandler } from "../app/api/v1/contact-fields/route";
import { auth } from "@reachdem/auth";
import { NextRequest } from "next/server";

describe("Contacts API (Phase 1)", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default authorized session
        (auth.api.getSession as any).mockResolvedValue({
            user: { id: "user-1", name: "Test User" },
            session: { activeOrganizationId: "org-1" }
        });
    });

    describe("Contact Validators & Creation", () => {
        it("should allow creating a contact with name and phone", async () => {
            const payload = {
                name: "Test Contact",
                phoneE164: "+1234567890",
            };

            const req = new NextRequest("http://localhost:3000/api/v1/contacts", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            prismaMock.contact.create.mockResolvedValue({ id: "contact-1", ...payload });

            const response = await createContactHandler(req);
            expect(response.status).toBe(201);

            const json = await response.json();
            expect(json.data.id).toBe("contact-1");
        });

        it("should allow creating a contact with name and email", async () => {
            const payload = {
                name: "Test Contact",
                email: "test@example.com",
            };

            const req = new NextRequest("http://localhost:3000/api/v1/contacts", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            prismaMock.contact.create.mockResolvedValue({ id: "contact-2", ...payload });

            const response = await createContactHandler(req);
            expect(response.status).toBe(201);
        });

        it("should reject creating a contact without both phone and email", async () => {
            const payload = {
                name: "Test Contact",
            };

            const req = new NextRequest("http://localhost:3000/api/v1/contacts", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await createContactHandler(req);
            expect(response.status).toBe(400);

            const json = await response.json();
            expect(json.error[0].message).toContain("Either phone number or email");
        });
    });

    describe("Contact Custom Fields", () => {
        it("should enforce maximum of 5 custom fields per organization", async () => {
            // Mock that there are already 5 fields
            prismaMock.contactFieldDefinition.count.mockResolvedValue(5);

            const payload = {
                key: "new_field",
                label: "New Field",
                type: "TEXT"
            };

            const req = new NextRequest("http://localhost:3000/api/v1/contact-fields", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await createContactFieldHandler(req);
            expect(response.status).toBe(400);

            const json = await response.json();
            expect(json.error).toContain("Maximum number of custom fields");
        });

        it("should reject contact creation if custom field type is invalid", async () => {
            // Mock definition mapping
            prismaMock.contactFieldDefinition.findMany.mockResolvedValue([
                { key: "age", type: "NUMBER" }
            ]);

            const payload = {
                name: "John Doe",
                email: "john@doe.com",
                customFields: {
                    "age": "twenty" // Invalid type, should be number
                }
            };

            const req = new NextRequest("http://localhost:3000/api/v1/contacts", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await createContactHandler(req);
            expect(response.status).toBe(400);

            const json = await response.json();
            expect(json.error).toContain("Expected type: NUMBER");
        });

        it("should reject contact creation if custom field key does not exist", async () => {
            // Mock definition mapping (empty)
            prismaMock.contactFieldDefinition.findMany.mockResolvedValue([]);

            const payload = {
                name: "John Doe",
                email: "john@doe.com",
                customFields: {
                    "unknown_key": "value"
                }
            };

            const req = new NextRequest("http://localhost:3000/api/v1/contacts", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const response = await createContactHandler(req);
            expect(response.status).toBe(400);

            const json = await response.json();
            expect(json.error).toContain("not defined for this workspace");
        });
    });
});
