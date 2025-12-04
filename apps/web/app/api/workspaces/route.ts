import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  isAuthed,
} from "@/lib/auth-helpers";
import { createWorkspaceSchema } from "@/lib/validations";

const MAX_OWNED_WORKSPACES = 3;

/**
 * GET /api/workspaces
 * Returns all workspaces where the current user is a member.
 */
export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (!isAuthed(authResult)) return authResult;

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: { userId: authResult.id },
      },
    },
    include: {
      _count: { select: { members: true, contacts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ workspaces });
}

/**
 * POST /api/workspaces
 * Creates a new workspace with the current user as owner.
 */
export async function POST(req: Request) {
  const authResult = await requireAuth(req);
  if (!isAuthed(authResult)) return authResult;

  // Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = createWorkspaceSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { name, slug } = validation.data;

  // Check owned workspace limit
  const ownedCount = await prisma.workspace.count({
    where: { ownerId: authResult.id },
  });

  if (ownedCount >= MAX_OWNED_WORKSPACES) {
    return NextResponse.json(
      { error: `You can own at most ${MAX_OWNED_WORKSPACES} workspaces` },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const existingSlug = await prisma.workspace.findUnique({
    where: { slug },
  });

  if (existingSlug) {
    return NextResponse.json(
      { error: "A workspace with this slug already exists" },
      { status: 400 }
    );
  }

  // Create workspace and member in transaction
  const workspace = await prisma.$transaction(async (tx: typeof prisma) => {
    const newWorkspace = await tx.workspace.create({
      data: {
        name,
        slug,
        ownerId: authResult.id,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: newWorkspace.id,
        userId: authResult.id,
        role: "OWNER",
      },
    });

    return newWorkspace;
  });

  return NextResponse.json({ workspace }, { status: 201 });
}
