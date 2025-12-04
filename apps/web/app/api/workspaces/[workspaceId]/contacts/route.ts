import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  requireWorkspaceAccess,
  isAuthed,
  hasAccess,
} from "@/lib/auth-helpers";
import { createContactSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * GET /api/workspaces/[workspaceId]/contacts
 * Returns contacts for a workspace with optional search.
 */
export async function GET(req: Request, context: RouteContext) {
  const authResult = await requireAuth(req);
  if (!isAuthed(authResult)) return authResult;

  const { workspaceId } = await context.params;

  const accessResult = await requireWorkspaceAccess(workspaceId, authResult.id);
  if (!hasAccess(accessResult)) return accessResult;

  // Parse query params
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";

  // Build search filter
  const searchFilter = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const contacts = await prisma.contact.findMany({
    where: {
      workspaceId,
      ...searchFilter,
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contacts });
}

/**
 * POST /api/workspaces/[workspaceId]/contacts
 * Creates a new contact in the workspace.
 */
export async function POST(req: Request, context: RouteContext) {
  const authResult = await requireAuth(req);
  if (!isAuthed(authResult)) return authResult;

  const { workspaceId } = await context.params;

  const accessResult = await requireWorkspaceAccess(workspaceId, authResult.id);
  if (!hasAccess(accessResult)) return accessResult;

  // Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = createContactSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { firstName, lastName, email, phone, whatsapp, attributes } =
    validation.data;

  const contact = await prisma.contact.create({
    data: {
      workspaceId,
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      attributes: attributes || null,
    },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
