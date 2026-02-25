import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@reachdem/auth';
import { prisma } from '@reachdem/database';

// Import the specific route functions we want to test
let listGroups: any;
let createGroup: any;

beforeAll(async () => {
    const route = await import('../app/api/v1/groups/route');
    listGroups = route.GET;
    createGroup = route.POST;
});

// --- 1. MOCK BETTER AUTH ---
vi.mock('@reachdem/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        },
    },
}));

// --- 2. MOCK NEXT HEADERS ---
vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue(new Map()),
}));

// --- 3. MOCK PRISMA (No real database connection) ---
vi.mock('@reachdem/database', () => ({
    prisma: {
        group: {
            findMany: vi.fn(),
            count: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
        }
    }
}));

describe('Groups API v1 - MOCKED UNIT TESTS', () => {

    const MOCK_ORG_ID = "mock-org-123";
    const MOCK_USER_ID = "mock-user-456";

    beforeEach(() => {
        vi.clearAllMocks();

        // Default to a logged-in user with an active organization
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { id: MOCK_USER_ID, email: "mock@example.com" } as any,
            session: { activeOrganizationId: MOCK_ORG_ID } as any
        });
    });

    describe('GET /api/v1/groups', () => {
        it('should return 401 if user is not authenticated', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            const req = new NextRequest('http://localhost:3000/api/v1/groups');
            const res = await listGroups(req);

            expect(res.status).toBe(401);
        });

        it('should list groups retrieved from Prisma mock', async () => {
            // Setup mock database return values
            const mockGroups = [{ id: "g1", name: "Group 1" }, { id: "g2", name: "Group 2" }];
            vi.mocked(prisma.group.findMany as any).mockResolvedValue(mockGroups);
            vi.mocked(prisma.group.count as any).mockResolvedValue(2);

            const req = new NextRequest('http://localhost:3000/api/v1/groups?limit=10');
            const res = await listGroups(req);

            expect(res.status).toBe(200);
            const json = await res.json();

            expect(json.data).toEqual(mockGroups);
            expect(json.meta.total).toBe(2);

            // Verify the mock was called correctly
            expect(prisma.group.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { organizationId: MOCK_ORG_ID },
                take: 10
            }));
        });
    });

    describe('POST /api/v1/groups', () => {
        it('should reject group creation if name is missing', async () => {
            const req = new NextRequest('http://localhost:3000/api/v1/groups', {
                method: 'POST',
                body: JSON.stringify({ description: "No name" })
            });

            const res = await createGroup(req);
            expect(res.status).toBe(400); // Zod validation failure
        });

        it('should return 409 Conflict if group name already exists', async () => {
            // Mock findFirst to return an existing group (simulating a collision)
            vi.mocked(prisma.group.findFirst as any).mockResolvedValue({ id: "g1", name: "VIPs" });

            const req = new NextRequest('http://localhost:3000/api/v1/groups', {
                method: 'POST',
                body: JSON.stringify({ name: "VIPs" })
            });

            const res = await createGroup(req);
            expect(res.status).toBe(409);
        });

        it('should successfully create a new group if valid', async () => {
            // Mock no collision
            vi.mocked(prisma.group.findFirst as any).mockResolvedValue(null);
            // Mock successful creation
            vi.mocked(prisma.group.create as any).mockResolvedValue({
                id: "g_new",
                name: "New Group",
                organizationId: MOCK_ORG_ID
            });

            const req = new NextRequest('http://localhost:3000/api/v1/groups', {
                method: 'POST',
                body: JSON.stringify({ name: "New Group" })
            });

            const res = await createGroup(req);
            expect(res.status).toBe(201);

            const json = await res.json();
            expect(json.data.id).toBe("g_new");

            // Verify creation included the organizationID securely
            expect(prisma.group.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: "New Group",
                    organizationId: MOCK_ORG_ID
                })
            });
        });
    });
});
