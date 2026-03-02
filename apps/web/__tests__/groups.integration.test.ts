import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@reachdem/auth/";
import { prisma } from "@reachdem/database";

let listGroups: any;
let createGroup: any;
let getGroup: any;
let updateGroup: any;
let deleteGroup: any;
let bulkAddMembers: any;
let bulkRemoveMembers: any;
let listGroupContacts: any;

import { beforeAll } from "vitest";

beforeAll(async () => {
  const route = await import("../app/api/v1/groups/route");
  listGroups = route.GET;
  createGroup = route.POST;

  const singleRoute = await import("../app/api/v1/groups/[id]/route");
  getGroup = singleRoute.GET;
  updateGroup = singleRoute.PATCH;
  deleteGroup = singleRoute.DELETE;

  const membersRoute = await import("../app/api/v1/groups/[id]/contacts/route");
  bulkAddMembers = membersRoute.POST;
  bulkRemoveMembers = membersRoute.DELETE;
  listGroupContacts = membersRoute.GET;
});

// Use Vitest to mock the required underlying Better Auth systems
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

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

describe("Groups API - REAL DATABASE INTEGRATION", () => {
  const createdGroupIds: string[] = [];
  const createdContactIds: string[] = [];

  const REAL_ORG_ID = process.env.TEST_ORG_ID;
  const TEST_USER_ID = process.env.TEST_USER_ID;
  const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;

  if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
    throw new Error(
      "Missing required test environment variables: TEST_ORG_ID, TEST_USER_ID, or TEST_USER_EMAIL"
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });
  });

  afterAll(async () => {
    // Strict DB Teardown
    for (const id of createdContactIds) {
      await prisma.contact.delete({ where: { id } }).catch(() => {});
    }
    for (const id of createdGroupIds) {
      await prisma.group.delete({ where: { id } }).catch(() => {});
    }
  });

  describe("Integration: Group CRUD", () => {
    it("should physically insert a group into the real database", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/groups", {
        method: "POST",
        body: JSON.stringify({
          name: "Test VIP Group",
          description: "A test group for real db integration",
        }),
      });

      const response = await createGroup(req);
      expect(response.status).toBe(201);

      const { data } = await response.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe("Test VIP Group");
      expect(data.organizationId).toBe(REAL_ORG_ID);

      createdGroupIds.push(data.id);
    });

    it("should reject group creation if the name already exists (case-insensitive)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/groups", {
        method: "POST",
        body: JSON.stringify({
          name: "test vip group", // lowercase version of previous
        }),
      });

      const response = await createGroup(req);
      expect(response.status).toBe(409); // Conflict
    });

    it("should physically update the group description", async () => {
      const groupId = createdGroupIds[0];
      const req = new NextRequest(
        `http://localhost:3000/api/v1/groups/${groupId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            description: "Updated description for integration tests",
          }),
        }
      );

      const response = await updateGroup(req as any, {
        params: Promise.resolve({ id: groupId }),
      });
      expect(response.status).toBe(200);

      const { data } = await response.json();
      expect(data.description).toBe(
        "Updated description for integration tests"
      );
    });

    it("should fetch a single group", async () => {
      const groupId = createdGroupIds[0];
      const getReq = new NextRequest(
        `http://localhost:3000/api/v1/groups/${groupId}`
      );
      const getRes = await getGroup(getReq as any, {
        params: Promise.resolve({ id: groupId }),
      });
      expect(getRes.status).toBe(200);

      const { data } = await getRes.json();
      expect(data.id).toBe(groupId);
      expect(data.name).toBe("Test VIP Group"); // from insertion
    });

    it("should reject modification of a group from another workspace", async () => {
      const orgSeed = Date.now().toString();
      // Mocking an organization explicitly to test security
      await prisma.organization
        .create({
          data: {
            id: `evil-org-${orgSeed}`,
            name: `Evil Corp ${orgSeed}`,
            slug: `evil-corp-${orgSeed}`,
          },
        })
        .catch(() => {});

      // This group belongs to evil-org, so REAL_ORG_ID should not be able to touch it
      const foreignGroup = await prisma.group.create({
        data: {
          name: `Foreign Group ${orgSeed}`,
          organizationId: `evil-org-${orgSeed}`,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/v1/groups/${foreignGroup.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ description: "Hacked description attempt" }),
        }
      );

      const response = await updateGroup(req as any, {
        params: Promise.resolve({ id: foreignGroup.id }),
      });

      // Should be 404 Not Found since it's scoped out by organizationId
      expect(response.status).toBe(404);

      await prisma.group.delete({ where: { id: foreignGroup.id } });
      await prisma.organization
        .delete({ where: { id: `evil-org-${orgSeed}` } })
        .catch(() => {});
    });

    it("should physically delete the group", async () => {
      const tempReq = new NextRequest("http://localhost:3000/api/v1/groups", {
        method: "POST",
        body: JSON.stringify({ name: "Group To Be Deleted" }),
      });
      const tempRes = await createGroup(tempReq);
      const { data } = await tempRes.json();
      const tempId = data.id;
      createdGroupIds.push(tempId);

      const req = new NextRequest(
        `http://localhost:3000/api/v1/groups/${tempId}`,
        {
          method: "DELETE",
        }
      );

      const response = await deleteGroup(req as any, {
        params: Promise.resolve({ id: tempId }),
      });
      expect(response.status).toBe(204);

      const getReq = new NextRequest(
        `http://localhost:3000/api/v1/groups/${tempId}`
      );
      const getRes = await getGroup(getReq as any, {
        params: Promise.resolve({ id: tempId }),
      });
      expect(getRes.status).toBe(404); // Proves it was deleted
    });
  });

  describe("Integration: Bulk Memberships", () => {
    let targetGroupId: string;

    beforeEach(async () => {
      // Because tests are sometimes run out of order by Vitest, ensure we have a valid group
      if (createdGroupIds.length === 0) {
        const newGrp = await prisma.group.create({
          data: { name: "Bulk Test Base", organizationId: REAL_ORG_ID },
        });
        createdGroupIds.push(newGrp.id);
      }
      targetGroupId = createdGroupIds[0];
    });

    it("should successfully bulk insert contacts into a group", async () => {
      // Seed 3 temporary contacts
      const promises = Array.from({ length: 3 }).map((_, i) =>
        prisma.contact.create({
          data: {
            name: `Bulk Member ${i}`,
            email: `bulk_${i}@example.com`,
            organizationId: REAL_ORG_ID,
          },
        })
      );
      const contacts = await Promise.all(promises);
      contacts.forEach((c) => createdContactIds.push(c.id));
      const contactIds = contacts.map((c) => c.id);

      const req = new NextRequest(
        `http://localhost:3000/api/v1/groups/${targetGroupId}/contacts`,
        {
          method: "POST",
          body: JSON.stringify({ contact_ids: contactIds }),
        }
      );

      const response = await bulkAddMembers(req as any, {
        params: Promise.resolve({ id: targetGroupId }),
      });
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.message).toContain("Successfully added 3 new members");
    }, 15000);

    it("should safely paginate contacts attached to the specific group", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/groups/${targetGroupId}/contacts?limit=2`
      );
      const response = await listGroupContacts(req as any, {
        params: Promise.resolve({ id: targetGroupId }),
      });
      expect(response.status).toBe(200);

      const { data: _ignored, items, meta } = await response.json(); // Safe DTOs are mapped to 'items'
      expect(items.length).toBe(2);
      expect(items[0].email).toBeDefined(); // Demonstrates we are getting actual valid contacts via join relation
      expect(meta.total).toBeGreaterThanOrEqual(3);
    });

    it("should successfully bulk remove contacts from a group", async () => {
      // Use 2 of the 3 contacts inserted above
      const removeIds = [createdContactIds[0], createdContactIds[1]];

      const req = new NextRequest(
        `http://localhost:3000/api/v1/groups/${targetGroupId}/contacts`,
        {
          method: "DELETE",
          body: JSON.stringify({ contact_ids: removeIds }),
        }
      );

      const response = await bulkRemoveMembers(req as any, {
        params: Promise.resolve({ id: targetGroupId }),
      });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.message).toContain("Successfully removed 2 members");

      // Verify via raw Prisma that they are truly unlinked
      const count = await prisma.groupMember.count({
        where: { groupId: targetGroupId, contactId: { in: removeIds } },
      });
      expect(count).toBe(0);
    });

    it("should reject bulk insertions that attempt to span workspaces", async () => {
      // Create an Evil Org first to satisfy foreign key constraints
      await prisma.organization
        .create({
          data: { id: "evil-org-2", name: "Evil Corp", slug: "evil-corp-2" },
        })
        .catch(() => {}); // Ignore if it somehow already exists

      // Create an Evil Contact in another workspace
      const evContact = await prisma.contact.create({
        data: { name: "Hacker", organizationId: "evil-org-2" },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/v1/groups/${targetGroupId}/contacts`,
        {
          method: "POST",
          body: JSON.stringify({ contact_ids: [evContact.id] }), // Trying to assign foreign contact
        }
      );

      const response = await bulkAddMembers(req as any, {
        params: Promise.resolve({ id: targetGroupId }),
      });
      expect(response.status).toBe(400); // Bad request (security
      // Teardown evil contact and org
      await prisma.contact.delete({ where: { id: evContact.id } });
      await prisma.organization
        .delete({ where: { id: "evil-org-2" } })
        .catch(() => {});
    });

    it("should fail elegantly if bulk payload exceeds 10000 contacts", async () => {
      const massiveArray = Array.from(
        { length: 10001 },
        (_, i) => `fake_id_${i}`
      );

      const req = new NextRequest(
        `http://localhost:3000/api/v1/groups/${targetGroupId}/contacts`,
        {
          method: "POST",
          body: JSON.stringify({ contact_ids: massiveArray }),
        }
      );

      const response = await bulkAddMembers(req as any, {
        params: Promise.resolve({ id: targetGroupId }),
      });
      expect(response.status).toBe(400);
      const { error } = await response.json();
      expect(JSON.stringify(error)).toContain("10,000 contacts");
    });
  });
});
