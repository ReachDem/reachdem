import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * RBAC helper utilities for org-scoped route protection.
 *
 * Usage in Next.js server components / route handlers / server actions:
 *
 *   import { requireAuth, requireOwner } from "@reachdem/auth";
 *
 *   export async function POST(req: Request) {
 *     const { session, user } = await requireAuth();
 *     // or for owner-only:
 *     const { session, user, member } = await requireOwner();
 *   }
 */

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Get the authenticated session or throw 401.
 */
export async function requireAuth(): Promise<NonNullable<SessionResult>> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    return session;
}

/**
 * Assert the user has an active organization selected.
 * Returns the session + active org info.
 */
export async function requireOrgMembership() {
    const session = await requireAuth();

    if (!session.session.activeOrganizationId) {
        throw new Response(
            JSON.stringify({ error: "No active organization. Please select a workspace." }),
            { status: 403, headers: { "Content-Type": "application/json" } },
        );
    }

    const activeMember = await auth.api.getActiveMember({
        headers: await headers(),
    });

    if (!activeMember) {
        throw new Response(
            JSON.stringify({ error: "You are not a member of the active organization." }),
            { status: 403, headers: { "Content-Type": "application/json" } },
        );
    }

    return { ...session, member: activeMember };
}

/**
 * Assert the user has one of the specified roles in the active organization.
 */
export async function requireRole(roles: string[]) {
    const result = await requireOrgMembership();
    const memberRole = result.member.role;

    // A member can have multiple roles separated by commas
    const userRoles = memberRole ? memberRole.split(",").map((r: string) => r.trim()) : [];
    const hasRole = userRoles.some((r: string) => roles.includes(r));

    if (!hasRole) {
        throw new Response(
            JSON.stringify({
                error: `Insufficient permissions. Required role: ${roles.join(" or ")}`,
            }),
            { status: 403, headers: { "Content-Type": "application/json" } },
        );
    }

    return result;
}

/**
 * Convenience: require "owner" role.
 */
export async function requireOwner() {
    return requireRole(["owner"]);
}

/**
 * Convenience: require "admin" or "owner" role.
 */
export async function requireAdminOrOwner() {
    return requireRole(["admin", "owner"]);
}

/**
 * Get the active organization details for the current session.
 * Returns null if no active org is set.
 */
export async function getActiveOrganization() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.session.activeOrganizationId) {
        return null;
    }

    const org = await auth.api.getFullOrganization({
        headers: await headers(),
        query: { organizationId: session.session.activeOrganizationId },
    });

    return org;
}
