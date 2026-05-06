import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@reachdem/database";

type WorkerTarget = "staging" | "production" | "env";

const knownWorkerUrls: Record<Exclude<WorkerTarget, "env">, string> = {
  staging: "https://reachdem-worker-campaign-staging.latioms.workers.dev",
  production: "https://reachdem-worker-campaign.latioms.workers.dev",
};

function loadEnvFile(path: string): void {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) return;

  const content = readFileSync(absolutePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadLocalEnv(): void {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  loadEnvFile("apps/web/.env");
  loadEnvFile("apps/web/.env.local");
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function last4Email(email: string): string {
  return email.trim().toLowerCase().slice(-4);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function chooseOrganizationId(recipientEmail: string): Promise<string> {
  const explicitOrganizationId =
    readArg("--organization-id") ??
    process.env.SMOKE_ORG_ID ??
    process.env.TEST_ORG_ID;

  if (explicitOrganizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: explicitOrganizationId },
      select: { id: true },
    });
    if (!organization) {
      throw new Error(`Organization ${explicitOrganizationId} was not found`);
    }
    return organization.id;
  }

  const user = await prisma.user.findUnique({
    where: { email: recipientEmail },
    include: {
      members: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const memberOrganization = user?.members[0]?.organization;
  if (memberOrganization) return memberOrganization.id;

  const firstOrganization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!firstOrganization) {
    throw new Error("No organization found for smoke test");
  }
  return firstOrganization.id;
}

async function publishCampaignLaunch(input: {
  campaignId: string;
  organizationId: string;
  target: WorkerTarget;
}): Promise<void> {
  const configuredUrl = process.env.REACHDEM_WORKER_CAMPAIGN_URL?.trim();
  const workerBaseUrl =
    input.target === "env" ? configuredUrl : knownWorkerUrls[input.target];
  if (!workerBaseUrl) {
    throw new Error(
      "Missing REACHDEM_WORKER_CAMPAIGN_URL or pass --target staging|production"
    );
  }

  const url = new URL(
    "/queue/campaign-launch",
    workerBaseUrl.endsWith("/") ? workerBaseUrl : `${workerBaseUrl}/`
  );
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": requireEnv("REACHDEM_WORKER_INTERNAL_SECRET"),
    },
    body: JSON.stringify({
      campaign_id: input.campaignId,
      organization_id: input.organizationId,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Campaign worker publish failed with HTTP ${response.status}: ${body.slice(0, 500)}`
    );
  }

  console.log(
    `[smoke] queued campaign launch on ${url.origin} for campaign ${input.campaignId}`
  );
}

async function waitForResult(campaignId: string, timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    const targets = await prisma.campaignTarget.findMany({
      where: { campaignId },
      select: { id: true, status: true, messageId: true },
      orderBy: { createdAt: "asc" },
    });
    const messageIds = targets
      .map((target) => target.messageId)
      .filter((id): id is string => Boolean(id));
    const messages = messageIds.length
      ? await prisma.message.findMany({
          where: { id: { in: messageIds } },
          include: { attempts: { orderBy: { createdAt: "asc" } } },
          orderBy: { createdAt: "asc" },
        })
      : [];

    const terminalMessages = messages.filter((message) =>
      ["sent", "failed"].includes(message.status)
    );
    if (messages.length > 0 && terminalMessages.length === messages.length) {
      return { campaign, targets, messages };
    }

    await sleep(3_000);
  }

  throw new Error(
    `Timed out waiting for campaign ${campaignId} worker result after ${timeoutMs}ms`
  );
}

async function main() {
  loadLocalEnv();

  const recipientEmail =
    readArg("--to") ?? process.env.TEST_EMAIL_TO ?? "latioms@gmail.com";
  const target = (readArg("--target") ?? "production") as WorkerTarget;
  if (!["staging", "production", "env"].includes(target)) {
    throw new Error("--target must be staging, production, or env");
  }

  requireEnv("DATABASE_URL");
  requireEnv("REACHDEM_WORKER_INTERNAL_SECRET");

  const organizationId = await chooseOrganizationId(recipientEmail);
  const timestamp = new Date().toISOString();
  const runName = `Worker Email Smoke ${timestamp}`;
  const contactName = "ReachDem Worker Smoke";

  const group = await prisma.group.create({
    data: {
      organizationId,
      name: `${runName} Group`,
      description: "Created by scripts/smoke-email-campaign-worker.ts",
    },
  });

  const contact = await prisma.contact.create({
    data: {
      organizationId,
      name: contactName,
      email: recipientEmail,
      hasValidEmail: true,
      hasEmailableAddress: true,
      memberships: {
        create: { groupId: group.id },
      },
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      organizationId,
      name: runName,
      description: "Smoke test through dedicated campaign and email workers",
      channel: "email",
      status: "running",
      content: {
        subject: `ReachDem worker smoke ${timestamp}`,
        from: "ReachDem",
        html: [
          `<p>Bonjour ${contactName},</p>`,
          "<p>Ceci est un test controle de campagne email via les nouveaux workers ReachDem.</p>",
          `<p>Run: ${timestamp}</p>`,
        ].join(""),
      },
    },
  });

  await prisma.campaignAudience.create({
    data: {
      organizationId,
      campaignId: campaign.id,
      sourceType: "group",
      sourceId: group.id,
    },
  });

  await publishCampaignLaunch({
    campaignId: campaign.id,
    organizationId,
    target,
  });

  const result = await waitForResult(campaign.id, 180_000);
  const message = result.messages[0];
  const attempt = message?.attempts[0];

  console.log(
    JSON.stringify(
      {
        ok: message?.status === "sent",
        target,
        recipient: recipientEmail,
        organizationId,
        campaignId: campaign.id,
        campaignStatus: result.campaign?.status,
        targetStatus: result.targets[0]?.status,
        messageId: message?.id,
        messageStatus: message?.status,
        provider: message?.providerSelected ?? attempt?.provider ?? null,
        providerMessageId:
          message?.providerMessageId ?? attempt?.providerMessageId ?? null,
        attemptStatus: attempt?.status ?? null,
        attemptErrorCode: attempt?.errorCode ?? null,
        attemptErrorMessage: attempt?.errorMessage ?? null,
        contactHash: hashEmail(recipientEmail),
        toLast4: last4Email(recipientEmail),
      },
      null,
      2
    )
  );

  if (message?.status !== "sent") {
    throw new Error(
      `Smoke email was not sent; final status is ${message?.status}`
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "[smoke] failed",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
