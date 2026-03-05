import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import {
  POST as createContactHandler,
  GET as getContactsHandler,
} from "../app/api/v1/contacts/route";
import {
  POST as createContactFieldHandler,
  GET as getContactFieldsHandler,
} from "../app/api/v1/contact-fields/route";
import {
  PATCH as updateContactHandler,
  DELETE as deleteContactHandler,
} from "../app/api/v1/contacts/[id]/route";
import {
  PATCH as updateContactFieldHandler,
  DELETE as deleteContactFieldHandler,
} from "../app/api/v1/contact-fields/[id]/route";
import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { NextRequest } from "next/server";

// 1. Mock ONLY the headers and auth session, but keep Prisma REAL
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

const authMock = vi.hoisted(() => ({
  api: {
    getSession: vi.fn(),
  },
}));

vi.mock("@reachdem/auth/auth", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    auth: authMock,
  };
});

describe("Contacts API - REAL DATABASE INTEGRATION", () => {
  // We need to keep track of created IDs to clean them up after tests
  const createdContactIds: string[] = [];
  const createdFieldIds: string[] = [];

  const REAL_ORG_ID = process.env.TEST_ORG_ID;
  const TEST_USER_ID = process.env.TEST_USER_ID;
  const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;

  // Ensure tests don't run against real db if environment variables aren't properly configured
  if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
    throw new Error(
      "Missing required test environment variables: TEST_ORG_ID, TEST_USER_ID, or TEST_USER_EMAIL"
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // We still mock the session to pretend we are logged in,
    // but the rest of the code will hit the REAL database.
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });
  });

  // --- CLEANUP AFTER TESTS ---
  // It's crucial to clean up the real database so tests don't permanently alter your local DB
  afterAll(async () => {
    if (createdContactIds.length > 0) {
      await prisma.contact.deleteMany({
        where: { id: { in: createdContactIds } },
      });
    }

    if (createdFieldIds.length > 0) {
      await prisma.contactFieldDefinition.deleteMany({
        where: { id: { in: createdFieldIds } },
      });
    }
  });

  describe("Integration: Contact Creation", () => {
    it("should physically insert a contact into the real database", async () => {
      const payload = {
        name: "Real Integration Test Contact",
        phoneE164: "+33612345678",
        email: "integration@test.com",
      };

      const req = new NextRequest("http://localhost:3000/api/v1/contacts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const response = await createContactHandler(req as any, {
        params: Promise.resolve({} as Record<string, string>),
      });

      // Check HTTP status
      expect(response.status).toBe(201);

      const json = await response.json();
      const newContactId = json.data.id;

      // Save ID for cleanup
      expect(newContactId).toBeDefined();
      createdContactIds.push(newContactId);

      // Verify it ACTUALLY exists in the real database
      const dbContact = await prisma.contact.findUnique({
        where: { id: newContactId },
      });

      expect(dbContact).not.toBeNull();
      expect(dbContact?.name).toBe("Real Integration Test Contact");
      expect(dbContact?.organizationId).toBe(REAL_ORG_ID);
    });

    it("should physically retrieve the contacts from the real database", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/v1/contacts?limit=10",
        {
          method: "GET",
        }
      );

      const response = await getContactsHandler(req as any, {
        params: Promise.resolve({} as Record<string, string>),
      });
      expect(response.status).toBe(200);

      const json = await response.json();

      // We should have at least the contact we just created above
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      // Verify pagination metadata
      expect(json.meta).toBeDefined();
      expect(json.meta.total).toBeGreaterThanOrEqual(1);
    });

    it("should reject contact creation if BOTH phone and email are missing", async () => {
      const payload = {
        name: "Invalid Contact",
        // Notice: no email, no phone
      };

      const req = new NextRequest("http://localhost:3000/api/v1/contacts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const res = await createContactHandler(req as any, {
        params: Promise.resolve({} as Record<string, string>),
      });

      // Should fail validation
      expect(res.status).toBe(400);

      const json = await res.json();
      // Checking the Zod error structure
      expect(json.error).toBeDefined();
      expect(JSON.stringify(json.error)).toContain(
        "Either phone number or email"
      );
    });

    it("should physically update the contact in the database", async () => {
      // First we need one to update, let's just create another one to isolate tests
      const payload = {
        name: "Pre-update Contact",
        phoneE164: "+111222333",
      };

      const createReq = new NextRequest(
        "http://localhost:3000/api/v1/contacts",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      const createRes = await createContactHandler(createReq as any, {
        params: Promise.resolve({} as Record<string, string>),
      });
      const { data } = await createRes.json();
      const contactId = data.id;
      createdContactIds.push(contactId);

      // Now update it
      const updatePayload = {
        name: "Updated Contact Name",
      };

      const updateReq = new NextRequest(
        `http://localhost:3000/api/v1/contacts/${contactId}`,
        {
          method: "PATCH",
          body: JSON.stringify(updatePayload),
        }
      );

      // Pass the Next.js App Router context { params: Promise<{ id }> }
      const ctx = {
        params: Promise.resolve({ id: contactId }),
      };
      const updateRes = await updateContactHandler(updateReq as any, ctx);
      expect(updateRes.status).toBe(200);

      // Verify in actual database
      const dbContact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
      expect(dbContact?.name).toBe("Updated Contact Name");
      expect(dbContact?.phoneE164).toBe("+111222333"); // Preserved old value
    });

    it("should reject a contact update if it removes both phone and email", async () => {
      // Create a valid contact first
      const payload = {
        name: "Valid Contact",
        phoneE164: "+444555666",
        email: "keepme@test.com",
      };

      const createReq = new NextRequest(
        "http://localhost:3000/api/v1/contacts",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      const createRes = await createContactHandler(createReq as any, {
        params: Promise.resolve({} as Record<string, string>),
      });
      const { data } = await createRes.json();
      const contactId = data.id;
      createdContactIds.push(contactId);

      // Now update it to clear both phone and email
      const updatePayload = {
        phoneE164: null,
        email: null,
      };

      const updateReq = new NextRequest(
        `http://localhost:3000/api/v1/contacts/${contactId}`,
        {
          method: "PATCH",
          body: JSON.stringify(updatePayload),
        }
      );

      // Pass the Next.js App Router context { params: Promise<{ id }> }
      const ctx = {
        params: Promise.resolve({ id: contactId }),
      };
      const updateRes = await updateContactHandler(updateReq as any, ctx);
      expect(updateRes.status).toBe(400);

      const json = await updateRes.json();
      expect(JSON.stringify(json.error)).toContain(
        "A contact must have at least an email or a phone number"
      );
    });

    it("should physically soft-delete the contact in the database", async () => {
      const payload = {
        name: "To be deleted",
        phoneE164: "+99999999",
      };

      const createReq = new NextRequest(
        "http://localhost:3000/api/v1/contacts",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      const createRes = await createContactHandler(createReq as any, {
        params: Promise.resolve({} as Record<string, string>),
      });
      const { data } = await createRes.json();
      const contactId = data.id;
      createdContactIds.push(contactId);

      const delReq = new NextRequest(
        `http://localhost:3000/api/v1/contacts/${contactId}`,
        {
          method: "DELETE",
        }
      );

      const ctx = { params: Promise.resolve({ id: contactId }) };
      const delRes = await deleteContactHandler(delReq as any, ctx);
      expect(delRes.status).toBe(204);

      // Verify it was soft-deleted
      const dbContact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
      expect(dbContact?.deletedAt).not.toBeNull();
    });
  });

  describe("Integration: Contact Fields CRUD", () => {
    let testFieldId: string;

    it("should successfully create a new contact field", async () => {
      const payload = {
        key: "int_test_company",
        label: "Integration Test Company",
        type: "TEXT",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/v1/contact-fields",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      const res = await createContactFieldHandler(req as any, {
        params: Promise.resolve({} as Record<string, string>),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      testFieldId = json.data.id;

      expect(testFieldId).toBeDefined();
      createdFieldIds.push(testFieldId);

      // Db check
      const dbField = await prisma.contactFieldDefinition.findUnique({
        where: { id: testFieldId },
      });
      expect(dbField?.key).toBe("int_test_company");
    });

    it("should retrieve contact fields for the workspace", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/v1/contact-fields",
        { method: "GET" }
      );
      const res = await getContactFieldsHandler(req as any, {
        params: Promise.resolve({} as Record<string, string>),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      const foundMyField = json.data.some((f: any) => f.id === testFieldId);
      expect(foundMyField).toBe(true);
    });

    it("should update a contact field definition", async () => {
      const payload = {
        label: "Updated Integration Label",
      };

      const req = new NextRequest(
        `http://localhost:3000/api/v1/contact-fields/${testFieldId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      const ctx = { params: Promise.resolve({ id: testFieldId }) };
      const res = await updateContactFieldHandler(req as any, ctx);
      expect(res.status).toBe(200);

      const dbField = await prisma.contactFieldDefinition.findUnique({
        where: { id: testFieldId },
      });
      expect(dbField?.label).toBe("Updated Integration Label");
    });

    it("should physically delete the contact field", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/contact-fields/${testFieldId}`,
        {
          method: "DELETE",
        }
      );

      const ctx = { params: Promise.resolve({ id: testFieldId }) };
      const res = await deleteContactFieldHandler(req as any, ctx);
      expect(res.status).toBe(204);

      const dbField = await prisma.contactFieldDefinition.findUnique({
        where: { id: testFieldId },
      });
      expect(dbField).toBeNull(); // Hard deleted
    });

    it("should fail to create a contact field when the organization limit (5) is reached", async () => {
      // First, we need to artificially inject 5 fields to fill the limit
      const dummyFields = Array.from({ length: 5 }).map((_, i) => ({
        organizationId: REAL_ORG_ID,
        key: `dummy_limit_field_${i}`,
        label: `Dummy Limit Field ${i}`,
        type: "TEXT",
      }));

      // Create them all
      const createPromises = dummyFields.map((f) =>
        prisma.contactFieldDefinition.create({ data: f as any })
      );
      const createdDummies = await Promise.all(createPromises);
      createdFieldIds.push(...createdDummies.map((f) => f.id));

      // Now, try to create the 6th field via the API
      const payload = {
        key: "dummy_limit_field_6",
        label: "The 6th Element",
        type: "NUMBER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/v1/contact-fields",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      const res = await createContactFieldHandler(req as any, {
        params: Promise.resolve({} as Record<string, string>),
      });

      // Should fail because limit is 5 (422 Unprocessable Entity)
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.error).toContain("Maximum number of custom fields");
    });
  });

  describe("Integration: Authorization", () => {
    it("should reject API calls with an invalid or missing session", async () => {
      // Override the session for this specific test to simulate an unauthorized user
      vi.mocked(auth.api.getSession).mockResolvedValue(null); // No session!

      const req = new NextRequest("http://localhost:3000/api/v1/contacts", {
        method: "GET",
      });
      const res = await getContactsHandler(req as any, {
        params: Promise.resolve({} as Record<string, string>),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("should reject API calls if the user does not have an active organization (workspace)", async () => {
      // Logged in user, but no organization selected
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "user_without_org", email: "no-org@test.com" } as any,
        session: { activeOrganizationId: null } as any, // Null org!
      });

      const req = new NextRequest("http://localhost:3000/api/v1/contacts", {
        method: "GET",
      });
      const res = await getContactsHandler(req as any, {
        params: Promise.resolve({} as Record<string, string>),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Workspace required");
    });
  });
});
