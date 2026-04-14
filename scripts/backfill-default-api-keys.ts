import { prisma } from "@reachdem/database";
import { ensureDefaultApiKeyForOrganization } from "@reachdem/auth/api-key";

async function run() {
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      members: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          userId: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let createdCount = 0;
  let skippedCount = 0;

  for (const organization of organizations) {
    const preferredMember =
      organization.members.find((member) =>
        ["owner", "admin"].includes(member.role)
      ) ?? organization.members[0];

    if (!preferredMember) {
      console.warn(
        `[api-key backfill] Skipped ${organization.id} (${organization.name}) because it has no members.`
      );
      skippedCount += 1;
      continue;
    }

    const before = await prisma.apiKey.count({
      where: {
        organizationId: organization.id,
        type: "default",
        revokedAt: null,
        deletedAt: null,
        encryptedSecret: {
          not: null,
        },
      },
    });

    await ensureDefaultApiKeyForOrganization({
      organizationId: organization.id,
      createdBy: preferredMember.userId,
    });

    if (before > 0) {
      skippedCount += 1;
      continue;
    }

    createdCount += 1;
    console.log(
      `[api-key backfill] Created default API key for ${organization.id} (${organization.name}).`
    );
  }

  console.log("");
  console.log(`[api-key backfill] Created: ${createdCount}`);
  console.log(`[api-key backfill] Already OK / skipped: ${skippedCount}`);
}

run()
  .catch((error) => {
    console.error("[api-key backfill] Failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
