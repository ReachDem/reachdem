import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/test/setup-latioms
 * Crée un workspace pour l'utilisateur latioms (temporaire pour dev)
 */
export async function GET() {
  try {
    // Trouver l'utilisateur latioms
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: "latioms", mode: "insensitive" } },
          { name: { contains: "latioms", mode: "insensitive" } },
        ],
      },
    });

    if (!user) {
      // Lister tous les utilisateurs pour debug
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
      });
      return NextResponse.json({
        error: "User 'latioms' not found",
        availableUsers: allUsers,
      }, { status: 404 });
    }

    // Vérifier si un workspace existe déjà
    const existingWorkspace = await prisma.workspace.findFirst({
      where: { ownerId: user.id },
    });

    if (existingWorkspace) {
      return NextResponse.json({
        message: "Workspace already exists",
        user: { id: user.id, email: user.email, name: user.name },
        workspace: existingWorkspace,
      });
    }

    // Créer le workspace et le membership dans une transaction
    const workspace = await prisma.$transaction(async (tx: typeof prisma) => {
      const newWorkspace = await tx.workspace.create({
        data: {
          name: "Espace de Latioms",
          slug: "latioms-workspace",
          ownerId: user.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: newWorkspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return newWorkspace;
    });

    return NextResponse.json({
      message: "Workspace created successfully",
      user: { id: user.id, email: user.email, name: user.name },
      workspace,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
