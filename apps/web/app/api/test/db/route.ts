import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/test/db
 * Endpoint temporaire pour tester la connexion à la DB (à supprimer en prod)
 */
export async function GET() {
  try {
    // Test connexion DB
    const userCount = await prisma.user.count();
    const workspaceCount = await prisma.workspace.count();
    const contactCount = await prisma.contact.count();

    return NextResponse.json({
      status: "ok",
      database: "connected",
      counts: {
        users: userCount,
        workspaces: workspaceCount,
        contacts: contactCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
