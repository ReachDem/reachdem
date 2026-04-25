import { prisma } from "@reachdem/database";

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURATION — Modifie cette section avant d'exécuter le script
// ─────────────────────────────────────────────────────────────────────────────

const ORGANIZATION_ID = "f19dfc64-9b68-4ce9-8701-bae71cccbaab";
const CAMPAIGN_ID = "23b3a788-5c12-4986-966f-dfe860ddd209";

const SHOW_ALL_ATTEMPTS = true;

// ─────────────────────────────────────────────────────────────────────────────
//  Script — Ne pas modifier en dessous de cette ligne
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString() : "";
}

function short(value: string | null | undefined, max = 70) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

async function run() {
  if (!CAMPAIGN_ID || CAMPAIGN_ID === "PASTE_CAMPAIGN_ID_HERE") {
    console.error("Set CAMPAIGN_ID at the top of this file before running.");
    process.exitCode = 1;
    return;
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: CAMPAIGN_ID,
      organizationId: ORGANIZATION_ID,
    },
    select: {
      id: true,
      name: true,
      channel: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!campaign) {
    console.error(`Campaign not found: ${CAMPAIGN_ID}`);
    process.exitCode = 1;
    return;
  }

  if (campaign.channel !== "whatsapp") {
    console.warn(`Campaign channel is "${campaign.channel}", not "whatsapp".`);
  }

  const targets = await prisma.campaignTarget.findMany({
    where: {
      campaignId: CAMPAIGN_ID,
      organizationId: ORGANIZATION_ID,
    },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          phoneE164: true,
          hasValidNumber: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const messageIds = targets
    .map((target) => target.messageId)
    .filter((value): value is string => Boolean(value));

  const messages = messageIds.length
    ? await prisma.message.findMany({
        where: {
          id: { in: messageIds },
          organizationId: ORGANIZATION_ID,
        },
        include: {
          attempts: {
            orderBy: { attemptNo: "asc" },
          },
        },
      })
    : [];

  const messagesById = new Map(
    messages.map((message) => [message.id, message])
  );

  const rows = targets.map((target) => {
    const message = target.messageId
      ? messagesById.get(target.messageId)
      : null;
    const latestAttempt = message?.attempts.at(-1);

    return {
      contact: target.contact.name,
      phone: target.contact.phoneE164 ?? "",
      validNumber: String(target.contact.hasValidNumber),
      targetStatus: target.status,
      messageId: target.messageId ?? "",
      messageStatus: message?.status ?? "",
      provider: message?.providerSelected ?? "",
      providerMessageId: message?.providerMessageId ?? "",
      attempts: message?.attempts.length ?? 0,
      latestAttemptStatus: latestAttempt?.status ?? "",
      latestErrorCode: latestAttempt?.errorCode ?? "",
      latestErrorMessage: short(latestAttempt?.errorMessage),
      updatedAt: formatDate(message?.updatedAt),
    };
  });

  console.log("\nCampaign");
  console.table([
    {
      id: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      status: campaign.status,
      targets: targets.length,
      createdAt: formatDate(campaign.createdAt),
      updatedAt: formatDate(campaign.updatedAt),
    },
  ]);

  console.log("\nTargets / Messages");
  console.table(rows);

  if (SHOW_ALL_ATTEMPTS) {
    console.log("\nAttempts");
    for (const target of targets) {
      const message = target.messageId
        ? messagesById.get(target.messageId)
        : null;

      console.log(
        `\n${target.contact.name} (${target.contact.phoneE164 ?? "no phone"})`
      );

      if (!message) {
        console.log("  No message linked to this target.");
        continue;
      }

      if (message.attempts.length === 0) {
        console.log(`  Message ${message.id} has no attempts.`);
        continue;
      }

      console.table(
        message.attempts.map((attempt) => ({
          attemptNo: attempt.attemptNo,
          provider: attempt.provider,
          status: attempt.status,
          providerMessageId: attempt.providerMessageId ?? "",
          errorCode: attempt.errorCode ?? "",
          errorMessage: short(attempt.errorMessage, 120),
          durationMs: attempt.durationMs,
          createdAt: formatDate(attempt.createdAt),
        }))
      );
    }
  }
}

run()
  .catch((error) => {
    console.error("\nFailed to inspect WhatsApp campaign:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
