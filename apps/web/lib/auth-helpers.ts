import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthedUser = {
  id: string;
  email?: string | null;
};

/**
 * Validates the user session from request headers.
 * Returns the authenticated user or a 401 response.
 */
export async function requireAuth(
  req: Request
): Promise<AuthedUser | NextResponse> {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return {
    id: session.user.id,
    email: session.user.email,
  };
}

/**
 * Checks if a user has access to a workspace.
 * Returns true or a 403 response.
 */
export async function requireWorkspaceAccess(
  workspaceId: string,
  userId: string
): Promise<true | NextResponse> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return true as const;
}

/**
 * Type guard to check if the result is an authenticated user.
 */
export function isAuthed(
  result: AuthedUser | NextResponse
): result is AuthedUser {
  return !(result instanceof NextResponse);
}

/**
 * Type guard to check if the result is workspace access granted.
 */
export function hasAccess(result: true | NextResponse): result is true {
  return result === true;
}
