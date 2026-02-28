import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@reachdem/auth/';
import { prisma } from '@reachdem/database';
import { SegmentNode } from '@reachdem/shared';

let listSegments: any;
let createSegment: any;
let getSegment: any;
let updateSegment: any;
let deleteSegment: any;
let listSegmentContacts: any;

beforeAll(async () => {
    const route = await import('../app/api/v1/segments/route');
    listSegments = route.GET;
    createSegment = route.POST;

    const singleRoute = await import('../app/api/v1/segments/[id]/route');
    getSegment = singleRoute.GET;
    updateSegment = singleRoute.PATCH;
    deleteSegment = singleRoute.DELETE;

    const contactsRoute = await import('../app/api/v1/segments/[id]/contacts/route');
    listSegmentContacts = contactsRoute.GET;
});

// Mock Auth wrapper
const authMock = vi.hoisted(() => ({
    api: { getSession: vi.fn() }
}));

vi.mock('@reachdem/auth/auth', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return { ...actual, auth: authMock };
});

vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue(new Map()),
}));

describe('Segments API - REAL DATABASE INTEGRATION', () => {
    const createdSegmentIds: string[] = [];
    const createdContactIds: string[] = [];

    const REAL_ORG_ID = process.env.TEST_ORG_ID;
    const TEST_USER_ID = process.env.TEST_USER_ID;
    const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;

    if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
        throw new Error("Missing required test environment variables");
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
            session: { activeOrganizationId: REAL_ORG_ID } as any
        });
    });

    afterAll(async () => {
        for (const id of createdContactIds) {
            await prisma.contact.delete({ where: { id } }).catch(() => { });
        }
        for (const id of createdSegmentIds) {
            await prisma.segment.delete({ where: { id } }).catch(() => { });
        }
    });

    let primarySegmentId: string;

    it('should physically create a segment with a valid JSON AST', async () => {
        const definition: SegmentNode = {
            op: "AND",
            children: [
                { field: "address", operator: "eq", type: "string", value: "Testopia" }
            ]
        };

        const req = new NextRequest('http://localhost:3000/api/v1/segments', {
            method: 'POST',
            body: JSON.stringify({ name: 'Testopia Residents', definition })
        });
        const response = await createSegment(req as any, { params: Promise.resolve({} as Record<string, string>) });

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.name).toBe('Testopia Residents');
        primarySegmentId = data.id;
        createdSegmentIds.push(primarySegmentId);
    });

    it('should reliably evaluate contacts that match the dynamic segment criteria', async () => {
        // Insert a dummy contact that matches "Testopia"
        const contact = await prisma.contact.create({
            data: {
                organizationId: REAL_ORG_ID,
                name: "Segment Evaluator",
                email: "evaluator@testopia.local",
                address: "Testopia"
            }
        });
        createdContactIds.push(contact.id);

        // Fetch contacts for the segment
        const req = new NextRequest(`http://localhost:3000/api/v1/segments/${primarySegmentId}/contacts`);
        const response = await listSegmentContacts(req as any, { params: Promise.resolve({ id: primarySegmentId }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.total).toBeGreaterThanOrEqual(1);

        // Assert the generated contact was securely grabbed
        const found = data.items.some((c: any) => c.id === contact.id);
        expect(found).toBe(true);
    });

    it('should actively evaluate Contacts via Postgres JSONB custom fields', async () => {
        // Create Segment with custom field definition
        const definition: SegmentNode = {
            op: "AND",
            children: [
                { field: "custom.vip_rank", operator: "eq", type: "string", value: "Diamond" }
            ]
        };

        const reqCreate = new NextRequest('http://localhost:3000/api/v1/segments', {
            method: 'POST',
            body: JSON.stringify({ name: 'Diamonds', definition })
        });
        const respCreate = await createSegment(reqCreate as any, { params: Promise.resolve({} as Record<string, string>) });
        const customSegmentId = (await respCreate.json()).id;
        createdSegmentIds.push(customSegmentId);

        // Insert Contact with JSON map
        const contact = await prisma.contact.create({
            data: {
                organizationId: REAL_ORG_ID,
                name: "JSON King",
                email: "json@neon.local",
                customFields: {
                    vip_rank: "Diamond",
                    other_prop: 99
                }
            }
        });
        createdContactIds.push(contact.id);

        // Fetch Evaluation
        const reqEval = new NextRequest(`http://localhost:3000/api/v1/segments/${customSegmentId}/contacts`);
        const respEval = await listSegmentContacts(reqEval as any, { params: Promise.resolve({ id: customSegmentId }) });

        expect(respEval.status).toBe(200);
        const data = await respEval.json();
        const found = data.items.some((c: any) => c.id === contact.id);
        expect(found).toBe(true);
    });

    it('should delete the segment successfully', async () => {
        const req = new NextRequest(`http://localhost:3000/api/v1/segments/${primarySegmentId}`, { method: 'DELETE' });
        const response = await deleteSegment(req as any, { params: Promise.resolve({ id: primarySegmentId }) });
        expect(response.status).toBe(204);
    });
});
