import {
  CampaignService,
  ContactService,
  EnqueueEmailUseCase,
  EnqueueSmsUseCase,
  GroupMemberService,
  GroupService,
  MessageService,
} from "@reachdem/core";
import { prisma } from "@reachdem/database";
import { publishEmailJob } from "@/lib/publish-email-job";
import { publishSmsJob } from "@/lib/publish-sms-job";
import type {
  AIContextSnapshot,
  AIPageContext,
  AITableColumn,
  AITableData,
  AISuggestedAction,
  AIToolExecutionRecord,
} from "./types";

export interface ContactQueryFilter {
  q?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
  hasPhone?: boolean;
  hasEmail?: boolean;
  enterprise?: string;
  limit?: number;
  createdBefore?: Date;
  createdAfter?: Date;
}

export async function buildAIContext(input: {
  organizationId: string;
  page?: AIPageContext;
}): Promise<AIContextSnapshot> {
  const facts: string[] = [];
  const resources: Record<string, unknown> = {};
  const toolCalls: AIContextSnapshot["toolCalls"] = [];

  const page = input.page;

  if (!page?.resourceType || !page.resourceId) {
    return { facts, resources, toolCalls };
  }

  try {
    switch (page.resourceType) {
      case "contact": {
        const contact = await ContactService.getContactById(
          page.resourceId,
          input.organizationId
        );
        resources.contact = contact;
        facts.push(
          `Active contact: ${contact.name || "Unnamed"} (${contact.email || contact.phoneE164 || "no direct channel"})`
        );
        toolCalls.push({
          capability: "getContact",
          mode: "read",
          status: "success",
          label: "Lecture du contact actif",
        });
        break;
      }

      case "campaign": {
        const campaign = await CampaignService.getCampaign(
          input.organizationId,
          page.resourceId
        );
        if (campaign) {
          resources.campaign = campaign;
          facts.push(
            `Active campaign: ${campaign.name} (${campaign.channel}, status ${campaign.status})`
          );
        }
        toolCalls.push({
          capability: "getCampaign",
          mode: "read",
          status: "success",
          label: "Lecture de la campagne active",
        });
        break;
      }

      case "message": {
        const message = await MessageService.getMessageById(
          input.organizationId,
          page.resourceId
        );
        resources.message = message;
        facts.push(
          `Active message: ${message.channel} to ${message.toLast4 ? `***${message.toLast4}` : "recipient"} (status ${message.status})`
        );
        toolCalls.push({
          capability: "getMessage",
          mode: "read",
          status: "success",
          label: "Lecture du message actif",
        });
        break;
      }

      default:
        break;
    }
  } catch {
    toolCalls.push({
      capability: `get${page.resourceType}`,
      mode: "read",
      status: "error",
      label: `Échec lecture ${page.resourceType}`,
    });
  }

  return { facts, resources, toolCalls };
}

type SearchResult = {
  rows: Record<string, unknown>[];
  total: number;
  strategyLabel: string;
  appliedFilter: ContactQueryFilter;
};

function normalizeForSearch(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function cloneFilter(filter: ContactQueryFilter): ContactQueryFilter {
  return {
    q: filter.q,
    gender: filter.gender,
    hasPhone: filter.hasPhone,
    hasEmail: filter.hasEmail,
    enterprise: filter.enterprise,
    limit: filter.limit,
    createdBefore: filter.createdBefore,
    createdAfter: filter.createdAfter,
  };
}

function dropGender(filter: ContactQueryFilter): ContactQueryFilter {
  const next = cloneFilter(filter);
  delete next.gender;
  return next;
}

function dropLocation(filter: ContactQueryFilter): ContactQueryFilter {
  const next = cloneFilter(filter);
  delete next.q;
  return next;
}

function simplifyLocation(filter: ContactQueryFilter): ContactQueryFilter {
  const next = cloneFilter(filter);
  const q = normalizeForSearch(filter.q);
  if (!q) return next;
  next.q = q
    .replace(/\b(ville|city|commune|quartier)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return next;
}

function lastLocationToken(filter: ContactQueryFilter): ContactQueryFilter {
  const next = cloneFilter(filter);
  const q = normalizeForSearch(filter.q);
  if (!q) return next;
  const tokens = q.split(" ").filter(Boolean);
  next.q = tokens[tokens.length - 1] ?? q;
  return next;
}

function dedupeStrategies(
  strategies: Array<{ label: string; filter: ContactQueryFilter }>
) {
  const seen = new Set<string>();
  return strategies.filter((entry) => {
    const key = JSON.stringify({
      label: entry.label,
      filter: {
        q: entry.filter.q ?? null,
        gender: entry.filter.gender ?? null,
        hasPhone: entry.filter.hasPhone ?? null,
        hasEmail: entry.filter.hasEmail ?? null,
        enterprise: entry.filter.enterprise ?? null,
      },
    });
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildStrategies(filter: ContactQueryFilter) {
  const hasGender = Boolean(filter.gender);
  const hasLocation = Boolean(normalizeForSearch(filter.q));

  const strategies: Array<{ label: string; filter: ContactQueryFilter }> = [
    { label: "Filtre exact", filter: cloneFilter(filter) },
  ];

  if (hasLocation) {
    strategies.push({
      label: "Lieu simplifié",
      filter: simplifyLocation(filter),
    });

    strategies.push({
      label: "Dernier token du lieu",
      filter: lastLocationToken(filter),
    });
  }

  if (hasGender && hasLocation) {
    strategies.push({
      label: "Même lieu sans contrainte de sexe",
      filter: dropGender(filter),
    });
  }

  if (hasGender) {
    strategies.push({
      label: "Même sexe sans contrainte de lieu",
      filter: dropLocation(filter),
    });
  }

  return dedupeStrategies(strategies).slice(0, 5);
}

async function runContactSearch(input: {
  organizationId: string;
  filter: ContactQueryFilter;
  strategyLabel: string;
}): Promise<SearchResult> {
  const { filter } = input;
  const limit = Math.min(filter.limit ?? 15, 50);
  const q = normalizeForSearch(filter.q);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andClauses: any[] = [
    { organizationId: input.organizationId, deletedAt: null },
  ];

  if (q.length > 0) {
    andClauses.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phoneE164: { contains: q } },
        { address: { contains: q, mode: "insensitive" } },
        { enterprise: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (filter.gender) {
    andClauses.push({ gender: filter.gender });
  }

  if (filter.enterprise) {
    andClauses.push({
      enterprise: { contains: filter.enterprise, mode: "insensitive" },
    });
  }

  if (filter.hasPhone === true) {
    andClauses.push({ phoneE164: { not: null } });
    andClauses.push({ phoneE164: { not: "" } });
  } else if (filter.hasPhone === false) {
    andClauses.push({
      OR: [{ phoneE164: null }, { phoneE164: "" }],
    });
  }

  if (filter.hasEmail === true) {
    andClauses.push({ email: { not: null } });
    andClauses.push({ email: { not: "" } });
  } else if (filter.hasEmail === false) {
    andClauses.push({
      OR: [{ email: null }, { email: "" }],
    });
  }

  if (filter.createdBefore) {
    andClauses.push({ createdAt: { lt: filter.createdBefore } });
  }
  if (filter.createdAfter) {
    andClauses.push({ createdAt: { gte: filter.createdAfter } });
  }

  const where = andClauses.length === 1 ? andClauses[0] : { AND: andClauses };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        phoneE164: true,
        email: true,
        enterprise: true,
        gender: true,
        address: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.count({ where }),
  ]);

  const genderLabel: Record<string, string> = {
    MALE: "Homme",
    FEMALE: "Femme",
    OTHER: "Autre",
    UNKNOWN: "—",
  };

  return {
    strategyLabel: input.strategyLabel,
    appliedFilter: filter,
    total,
    rows: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phoneE164 ?? null,
      email: c.email ?? null,
      address: c.address ?? null,
      enterprise: c.enterprise ?? null,
      gender: genderLabel[c.gender ?? "UNKNOWN"] ?? "—",
    })),
  };
}

function describeFilter(filter: ContactQueryFilter) {
  const parts: string[] = [];
  if (filter.gender === "MALE") parts.push("Homme");
  if (filter.gender === "FEMALE") parts.push("Femme");
  if (filter.gender === "OTHER") parts.push("Autre");
  if (filter.gender === "UNKNOWN") parts.push("Genre inconnu");
  if (filter.q) parts.push(`lieu/texte "${filter.q}"`);
  if (filter.enterprise) parts.push(`entreprise "${filter.enterprise}"`);
  if (filter.hasPhone === true) parts.push("avec téléphone");
  if (filter.hasPhone === false) parts.push("sans téléphone");
  if (filter.hasEmail === true) parts.push("avec email");
  if (filter.hasEmail === false) parts.push("sans email");
  if (filter.createdBefore)
    parts.push(
      `ajouté avant le ${filter.createdBefore.toLocaleDateString("fr-FR")}`
    );
  if (filter.createdAfter)
    parts.push(
      `ajouté après le ${filter.createdAfter.toLocaleDateString("fr-FR")}`
    );
  return parts.length > 0 ? parts.join(", ") : "tous";
}

function buildTable(result: SearchResult): AITableData {
  const columns: AITableColumn[] = [
    { key: "name", label: "Nom" },
    { key: "phone", label: "Téléphone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Ville / Adresse" },
    { key: "enterprise", label: "Entreprise" },
  ];

  if (!result.appliedFilter.gender) {
    columns.push({ key: "gender", label: "Sexe" });
  }

  return {
    columns,
    rows: result.rows,
    total: result.total,
    truncated: result.total > result.rows.length,
  };
}

export async function queryContacts(input: {
  organizationId: string;
  filter: ContactQueryFilter;
}): Promise<{
  facts: string[];
  tableData: AITableData;
  toolCalls: AIToolExecutionRecord[];
  suggestedActions: AISuggestedAction[];
  chosenStrategyLabel: string;
  fallbackUsed: boolean;
}> {
  const strategies = buildStrategies(input.filter);
  const results: SearchResult[] = [];

  for (const strategy of strategies) {
    const result = await runContactSearch({
      organizationId: input.organizationId,
      filter: strategy.filter,
      strategyLabel: strategy.label,
    });
    results.push(result);
    if (result.total > 0) break;
  }

  const bestResult = results.find((result) => result.total > 0) ??
    results[0] ?? {
      rows: [],
      total: 0,
      strategyLabel: "Filtre exact",
      appliedFilter: input.filter,
    };

  const fallbackUsed = bestResult.strategyLabel !== "Filtre exact";
  const filterDesc = describeFilter(bestResult.appliedFilter);

  const toolCalls: AIToolExecutionRecord[] = results.map((result) => ({
    capability: "queryContacts",
    mode: "read",
    status: "success",
    label: `${result.strategyLabel} · ${describeFilter(result.appliedFilter)} · ${result.total} trouvé${result.total > 1 ? "s" : ""}`,
  }));

  const urlParams = new URLSearchParams();
  if (bestResult.appliedFilter.q)
    urlParams.set("q", bestResult.appliedFilter.q);

  const facts = [
    `Contact semantic search completed in ${results.length} attempt(s), max 5 allowed.`,
    `Chosen strategy: ${bestResult.strategyLabel}.`,
    `Applied filter: ${filterDesc}.`,
    fallbackUsed
      ? "A fallback strategy was needed because the strict interpretation returned no result or weaker data coverage."
      : "The strict interpretation was sufficient.",
    `Contact data is already rendered in a table. Do not dump the rows again in prose.`,
  ];

  const suggestedActions: AISuggestedAction[] = [
    {
      label: "Ouvrir les contacts",
      href: `/contacts${urlParams.size > 0 ? `?${urlParams}` : ""}`,
      variant: "outline",
    },
  ];

  if (fallbackUsed && bestResult.total > 0) {
    suggestedActions.unshift({
      label: "Raffiner la recherche",
      message: "Peux-tu affiner ces résultats avec un autre filtre ?",
      variant: "outline",
    });
  }

  return {
    facts,
    tableData: buildTable(bestResult),
    toolCalls,
    suggestedActions,
    chosenStrategyLabel: bestResult.strategyLabel,
    fallbackUsed,
  };
}

// ── Create contact group ──────────────────────────────────────────────────────

/**
 * Create a named group and add the supplied contact IDs as members.
 * Called after the user approves the creation card (with edited name/description).
 */
export async function createContactGroup(input: {
  organizationId: string;
  name: string;
  description?: string;
  contactIds: string[];
}): Promise<{ groupId: string; memberCount: number }> {
  const group = await GroupService.createGroup(input.organizationId, {
    name: input.name,
    description: input.description ?? null,
  });

  let memberCount = 0;
  if (input.contactIds.length > 0) {
    memberCount = await GroupMemberService.addGroupMembers(
      group.id,
      input.organizationId,
      input.contactIds
    );
  }

  return { groupId: group.id, memberCount };
}

// ── Group search ──────────────────────────────────────────────────────────────

export interface GroupSearchResult {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

/**
 * Search groups by name (case-insensitive partial match).
 * Returns the best matches, limit 5.
 */
export async function queryGroups(input: {
  organizationId: string;
  nameLike: string;
}): Promise<GroupSearchResult[]> {
  const groups = await prisma.group.findMany({
    where: {
      organizationId: input.organizationId,
      name: { contains: input.nameLike, mode: "insensitive" },
    },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    memberCount: g._count.members,
  }));
}

// ── Create campaign draft ─────────────────────────────────────────────────────

export interface CreateCampaignInput {
  organizationId: string;
  userId: string;
  name: string;
  channel: "sms" | "email";
  smsBody?: string;
  /** Source: group ID */
  groupId?: string;
  /** Source: raw contact IDs (creates an ad-hoc group first) */
  contactIds?: string[];
}

export async function createCampaignDraft(input: CreateCampaignInput): Promise<{
  campaignId: string;
  name: string;
  channel: string;
}> {
  const content =
    input.channel === "sms"
      ? { text: input.smsBody ?? "" }
      : { subject: "", html: "", text: "" };

  const campaign = await CampaignService.createCampaign(
    input.organizationId,
    {
      name: input.name,
      channel: input.channel,
      content,
    },
    input.userId
  );

  // Attach audience
  let sourceId = input.groupId;
  if (!sourceId && input.contactIds && input.contactIds.length > 0) {
    // Create an ad-hoc group for direct contact targeting
    const group = await GroupService.createGroup(input.organizationId, {
      name: `Audience — ${input.name}`,
      description:
        "Groupe créé automatiquement par Hermès pour cette campagne.",
    });
    await GroupMemberService.addGroupMembers(
      group.id,
      input.organizationId,
      input.contactIds
    );
    sourceId = group.id;
  }

  if (sourceId) {
    await CampaignService.setAudiences(input.organizationId, campaign.id, {
      audiences: [{ sourceType: "group", sourceId }],
    });
  }

  return {
    campaignId: campaign.id,
    name: campaign.name,
    channel: campaign.channel,
  };
}

// ── Update campaign ───────────────────────────────────────────────────────────

export async function updateCampaignContent(input: {
  organizationId: string;
  campaignId: string;
  name?: string;
  smsBody?: string;
  emailSubject?: string;
  emailHtml?: string;
}): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.name) patch.name = input.name;
  if (input.smsBody !== undefined) {
    patch.content = { text: input.smsBody };
  }
  if (input.emailSubject !== undefined || input.emailHtml !== undefined) {
    patch.content = {
      subject: input.emailSubject ?? "",
      html: input.emailHtml ?? "",
      text: "",
    };
  }
  await CampaignService.updateCampaign(
    input.organizationId,
    input.campaignId,
    patch
  );
}

// ── Delete campaign ───────────────────────────────────────────────────────────

export async function deleteCampaignById(input: {
  organizationId: string;
  campaignId: string;
}): Promise<void> {
  await CampaignService.deleteCampaign(input.organizationId, input.campaignId);
}

// ── Update group ──────────────────────────────────────────────────────────────

export async function updateGroup(input: {
  organizationId: string;
  groupId: string;
  name?: string;
  description?: string;
  addContactIds?: string[];
  removeContactIds?: string[];
}): Promise<void> {
  if (input.name || input.description !== undefined) {
    await GroupService.updateGroup(input.organizationId, input.groupId, {
      name: input.name,
      description: input.description ?? null,
    });
  }
  if (input.addContactIds?.length) {
    await GroupMemberService.addGroupMembers(
      input.groupId,
      input.organizationId,
      input.addContactIds
    );
  }
  if (input.removeContactIds?.length) {
    await GroupMemberService.removeGroupMembers(
      input.groupId,
      input.organizationId,
      input.removeContactIds
    );
  }
}

// ── Delete group ──────────────────────────────────────────────────────────────

export async function deleteGroupById(input: {
  organizationId: string;
  groupId: string;
}): Promise<void> {
  await GroupService.deleteGroup(input.organizationId, input.groupId);
}

// ── Create temporary group ────────────────────────────────────────────────────

export async function createTemporaryGroup(input: {
  organizationId: string;
  name: string;
  contactIds: string[];
}): Promise<{ groupId: string; memberCount: number }> {
  return createContactGroup({
    organizationId: input.organizationId,
    name: input.name,
    description: "Groupe temporaire créé par Hermès.",
    contactIds: input.contactIds,
  });
}

// ── Send single SMS ───────────────────────────────────────────────────────────

export async function sendSingleSMS(input: {
  organizationId: string;
  contactId: string;
  message: string;
  userId: string;
}): Promise<{ messageId: string }> {
  const contact = await ContactService.getContactById(
    input.contactId,
    input.organizationId
  );
  if (!contact || !contact.phoneE164)
    throw new Error("Contact has no phone number");
  const result = await EnqueueSmsUseCase.execute(
    input.organizationId,
    {
      to: contact.phoneE164,
      text: input.message,
      from: "ReachDem",
      idempotency_key: crypto.randomUUID(),
    },
    publishSmsJob,
    { source: "system" }
  );
  return { messageId: result.message_id };
}

// ── Send single email ─────────────────────────────────────────────────────────

export async function sendSingleEmail(input: {
  organizationId: string;
  contactId: string;
  subject: string;
  htmlBody: string;
  userId: string;
}): Promise<{ messageId: string }> {
  const contact = await ContactService.getContactById(
    input.contactId,
    input.organizationId
  );
  if (!contact || !contact.email)
    throw new Error("Contact has no email address");
  const result = await EnqueueEmailUseCase.execute(
    input.organizationId,
    {
      to: contact.email,
      subject: input.subject,
      html: input.htmlBody,
      idempotency_key: crypto.randomUUID(),
    },
    publishEmailJob,
    { source: "system" }
  );
  return { messageId: result.message_id };
}
