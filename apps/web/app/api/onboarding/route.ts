import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthed } from "@/lib/auth-helpers";
import { z } from "zod";

const onboardingSchema = z.object({
  roles: z.array(z.string()).min(1, "At least one role is required"),
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters"),
  projectCode: z.string().min(2, "Project code must be at least 2 characters"),
  action: z.enum(["create", "join"]),
  kyb: z.object({
    companyName: z.string().optional(),
    industry: z.string().optional(),
    teamSize: z.string().optional(),
    website: z.string().optional(),
  }),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

/**
 * GET /api/onboarding
 * Check if the current user has completed onboarding.
 */
export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (!isAuthed(authResult)) return authResult;

  const user = await prisma.user.findUnique({
    where: { id: authResult.id },
    select: {
      onboardingCompleted: true,
      profile: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    onboardingCompleted: user.onboardingCompleted,
    profile: user.profile,
  });
}

/**
 * POST /api/onboarding
 * Complete the onboarding process: create profile and workspace.
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

  const validation = onboardingSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { roles, workspaceName, projectCode, action, kyb } = validation.data;

  // Check if user already completed onboarding
  const existingUser = await prisma.user.findUnique({
    where: { id: authResult.id },
    select: { onboardingCompleted: true },
  });

  if (existingUser?.onboardingCompleted) {
    return NextResponse.json(
      { error: "Onboarding already completed" },
      { status: 400 }
    );
  }

  // Generate a unique slug for the workspace
  let slug = generateSlug(workspaceName);
  let slugExists = await prisma.workspace.findUnique({ where: { slug } });
  let counter = 1;
  
  while (slugExists) {
    slug = `${generateSlug(workspaceName)}-${counter}`;
    slugExists = await prisma.workspace.findUnique({ where: { slug } });
    counter++;
  }

  // Create everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create or update user profile
    const profile = await tx.userProfile.upsert({
      where: { userId: authResult.id },
      create: {
        userId: authResult.id,
        roles,
        companyName: kyb.companyName || null,
        industry: kyb.industry || null,
        teamSize: kyb.teamSize || null,
        website: kyb.website || null,
      },
      update: {
        roles,
        companyName: kyb.companyName || null,
        industry: kyb.industry || null,
        teamSize: kyb.teamSize || null,
        website: kyb.website || null,
      },
    });

    // Create workspace if action is "create"
    let workspace = null;
    if (action === "create") {
      workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug,
          projectCode: projectCode.toUpperCase(),
          ownerId: authResult.id,
        },
      });

      // Add user as workspace owner member
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: authResult.id,
          role: "OWNER",
        },
      });
    }

    // Mark onboarding as complete
    await tx.user.update({
      where: { id: authResult.id },
      data: { onboardingCompleted: true },
    });

    return { profile, workspace };
  });

  return NextResponse.json(
    {
      success: true,
      profile: result.profile,
      workspace: result.workspace,
    },
    { status: 201 }
  );
}
