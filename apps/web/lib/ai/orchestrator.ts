import { detectPendingApprovals } from "./approvals";
import {
  buildAIContext,
  createContactGroup,
  createCampaignDraft,
  queryContacts,
  queryGroups,
} from "./capabilities";
import type { ContactQueryFilter } from "./capabilities";
import { generateAIText } from "./providers";
import type {
  AIChatRequest,
  AIChatResponse,
  AIStepTrace,
  AITableData,
  AISuggestedAction,
  PendingApproval,
} from "./types";

const GENDER_MALE =
  /\b(masculin|masculins|male|homme|hommes|garcon|garcons|boy|boys|man|men)\b/iu;
const GENDER_FEMALE =
  /\b(feminin|feminins|female|femme|femmes|fille|filles|girl|girls|woman|women)\b/iu;

const FILLER =
  /\b(montre|montrer|affiche|afficher|montre-moi|show|show\s*me|liste|lister|list|cherche|chercher|search|trouve|trouver|find|display|donne|voir|obtenir|quels?|quelles?|quel|quelle|tous|toutes|tout|all|les|the|des|de|du|le|la|moi|me|un|une|je|tu|vous|nous|il|elle|ils|elles|dans|in|from|et|and|or|ou|y|a|voici|ici|svp|please|contacts?|clients?|prospects?|personnes?|people|gens|genre|sexe|non|pas|ne|ni|mais|donc|alors|car|si|simplement|juste|seulement|vraiment|bien|aussi|encore|surtout|notamment|demandais|demandait|demande|voulais|voulait|veux|cherche|cherchais|aimerais|souhaitais|voudrais|voudrait|souhaitait|peux-tu|pouvez-vous|peux|pouvez|pourriez|pourras|avec|with|ayant|having|qui|que|sont|is|have|has|resident|residant|habitant|habite|habiter|vit|resident|residents|habitent|au|aux|par|pour|sur|sous|dont|masculins?|feminins?|puis|avoir|acces|ajoutes?|ajouts?|added|before|after)\b/giu;

function normalizeText(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseContactQuery(message: string): ContactQueryFilter | null {
  const normalizedMessage = normalizeText(message);

  const listVerbs =
    /\b(montre|montrer|show|affiche|afficher|liste|lister|list|cherche|chercher|search|trouve|trouver|find|display|quels?|quelles?|quel|quelle|donne|voir|obtenir)\b/i;
  const personNouns =
    /\b(contact|contacts|client|clients|prospect|prospects|personne|personnes|person|gens|homme|hommes|garcon|garcons|femme|femmes|fille|filles)\b/i;
  const genderTrigger =
    /\b(masculin|masculins|feminin|feminins|male|female|homme|hommes|femme|femmes|garcon|garcons|fille|filles)\b/i;
  const dateTrigger =
    /\b(avant\s+le\s+\d|apres\s+le\s+\d|depuis\s+le\s+\d|il\s+y\s+a\s+\d+\s+jour|ajoutes?\s+avant|ajoutes?\s+apres|ce\s+mois|mois\s+dernier|cette\s+semaine|this\s+month|last\s+month|this\s+week|before\s+the\s+\d|after\s+the\s+\d)\b/i;

  const hasVerb = listVerbs.test(normalizedMessage);
  const hasPerson = personNouns.test(normalizedMessage);
  const hasGender = genderTrigger.test(normalizedMessage);
  const hasDate = dateTrigger.test(normalizedMessage);

  const isContactQuery =
    (hasVerb && hasPerson) ||
    (hasVerb && hasGender) ||
    (hasPerson && hasGender) ||
    (hasDate && (hasPerson || hasVerb));

  if (!isContactQuery) return null;

  const filter: ContactQueryFilter = {};

  if (GENDER_MALE.test(normalizedMessage)) {
    filter.gender = "MALE";
  } else if (GENDER_FEMALE.test(normalizedMessage)) {
    filter.gender = "FEMALE";
  }

  if (
    /\b(sans\s+(numero|telephone|phone|tel)|no\s+phone|without\s+phone)\b/i.test(
      normalizedMessage
    )
  ) {
    filter.hasPhone = false;
  } else if (
    /\b(avec\s+(numero|telephone|phone|tel)|has\s+phone|with\s+phone)\b/i.test(
      normalizedMessage
    )
  ) {
    filter.hasPhone = true;
  }

  if (
    /\b(sans\s+(?:un\s+)?email|no\s+email|without\s+email)\b/i.test(
      normalizedMessage
    )
  ) {
    filter.hasEmail = false;
  } else if (
    /\b(avec\s+(?:un\s+)?email|has\s+email|with\s+email)\b/i.test(
      normalizedMessage
    )
  ) {
    filter.hasEmail = true;
  }

  // ── Date extraction ──────────────────────────────────────────────────────
  const today = new Date();
  let workingMessage = normalizedMessage;

  // "avant le N [de ce mois]" / "before the N(th)"
  const beforeDayRe =
    /\b(?:ajoutes?\s+)?(?:avant\s+le|before\s+the)\s+(\d{1,2})(?:e?r?|st|nd|rd|th)?(?:\s+(?:de\s+ce\s+mois(?:-ci)?|du\s+mois|of\s+this\s+month))?\b/;
  const beforeDayMatch = workingMessage.match(beforeDayRe);
  if (beforeDayMatch) {
    const day = parseInt(beforeDayMatch[1]);
    if (day >= 1 && day <= 31) {
      filter.createdBefore = new Date(
        today.getFullYear(),
        today.getMonth(),
        day,
        0,
        0,
        0,
        0
      );
    }
    workingMessage = workingMessage.replace(beforeDayRe, " ");
  }

  // "après le N / depuis le N [de ce mois]" / "after the N(th)"
  const afterDayRe =
    /\b(?:ajoutes?\s+)?(?:apres\s+le|depuis\s+le|after\s+the)\s+(\d{1,2})(?:e?r?|st|nd|rd|th)?(?:\s+(?:de\s+ce\s+mois(?:-ci)?|du\s+mois|of\s+this\s+month))?\b/;
  const afterDayMatch = workingMessage.match(afterDayRe);
  if (afterDayMatch) {
    const day = parseInt(afterDayMatch[1]);
    if (day >= 1 && day <= 31) {
      filter.createdAfter = new Date(
        today.getFullYear(),
        today.getMonth(),
        day,
        0,
        0,
        0,
        0
      );
    }
    workingMessage = workingMessage.replace(afterDayRe, " ");
  }

  // "il y a N jours" / "N days ago"
  const nDaysAgoRe = /\b(?:il\s+y\s+a\s+(\d+)\s+jours?|(\d+)\s+days?\s+ago)\b/;
  const nDaysAgoMatch = workingMessage.match(nDaysAgoRe);
  if (nDaysAgoMatch) {
    const n = parseInt(nDaysAgoMatch[1] ?? nDaysAgoMatch[2]);
    const d = new Date(today);
    d.setDate(today.getDate() - n);
    d.setHours(0, 0, 0, 0);
    filter.createdAfter = d;
    workingMessage = workingMessage.replace(nDaysAgoRe, " ");
  }

  // "cette semaine" / "this week"
  if (/\b(cette\s+semaine|this\s+week)\b/.test(workingMessage)) {
    const dow = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    filter.createdAfter = startOfWeek;
    workingMessage = workingMessage.replace(
      /\b(cette\s+semaine|this\s+week)\b/g,
      " "
    );
  }

  // "ce mois / this month" (only when no specific day boundary set)
  if (
    !filter.createdBefore &&
    !filter.createdAfter &&
    /\b(ce\s+mois(?:-ci)?|this\s+month)\b/.test(workingMessage)
  ) {
    filter.createdAfter = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    workingMessage = workingMessage.replace(
      /\b(ce\s+mois(?:-ci)?|this\s+month)\b/g,
      " "
    );
  }

  // "le mois dernier" / "last month"
  if (/\b(le\s+mois\s+dernier|last\s+month)\b/.test(workingMessage)) {
    filter.createdAfter = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
      0,
      0,
      0,
      0
    );
    filter.createdBefore = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    workingMessage = workingMessage.replace(
      /\b(le\s+mois\s+dernier|last\s+month)\b/g,
      " "
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  const locationMatch = workingMessage.match(
    /\b(?:de|du|des|a|au|aux|from|in)\s+([a-z0-9][a-z0-9\s-]{1,40})$/i
  );

  if (locationMatch?.[1]) {
    const location = locationMatch[1]
      .replace(FILLER, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (location.length >= 2) {
      filter.q = location;
      return filter;
    }
  }

  const stripped = workingMessage
    .replace(/[jcsdlmnqt]'/gi, " ")
    .replace(GENDER_MALE, " ")
    .replace(GENDER_FEMALE, " ")
    .replace(
      /\b(sans|avec|no|has|with)\s+(numero|telephone|phone|tel|email)\b/gi,
      " "
    )
    .replace(FILLER, " ")
    .replace(/[?!.,;:'"`«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped.length >= 2) {
    filter.q = stripped;
  }

  return filter;
}

function parseCampaignQuery(message: string): boolean {
  const normalized = normalizeText(message);
  return (
    /\b(campagne|campagnes|campaign|campaigns)\b/i.test(normalized) &&
    /\b(voir|voir\s+les|montre|montrer|affiche|afficher|liste|lister|list|show|recent|recentes?|dernieres?|last|mes|my|quelles?|quels?)\b/i.test(
      normalized
    )
  );
}

/**
 * Detects "create a campaign with/for [target]" intent.
 * Returns the raw target string (group name or contact filter phrase) or null.
 */
function parseCampaignCreationIntent(message: string): string | null {
  const normalized = normalizeText(message);
  const CREATE =
    /\b(creer?|cree|create|lancer|launch|faire|demarrer?|start|nouveau?|new)\b.{0,40}\b(campagne|campaign)\b/i;
  const FOR =
    /\b(campagne|campaign)\b.{0,50}\b(avec|pour|with|for|ciblant|targeting|cible)\b/i;
  if (!CREATE.test(normalized) && !FOR.test(normalized)) return null;

  // Extract target after "avec/pour/cible le groupe" or "avec les contacts"
  const targetMatch = normalized.match(
    /\b(?:avec|pour|with|for|ciblant|targeting|cible)\s+(?:le\s+)?(?:groupe\s+)?(?:des?\s+)?(.{2,60}?)(?:\s*[?.,]|$)/i
  );
  return targetMatch?.[1]?.trim() ?? "";
}

async function draftSMSBodyWithAI(input: {
  userId: string;
  organizationId: string;
  topic: string;
  targetLabel: string;
}): Promise<string> {
  const result = await generateAIText({
    userId: input.userId,
    organizationId: input.organizationId,
    system:
      "You are an expert SMS copywriter for political campaigns. Write a concise, engaging SMS message (max 160 characters). " +
      "Return ONLY the SMS text, no explanation, no quotes, no subject line.",
    prompt: `Write an SMS for: ${input.topic}\nTarget audience: ${input.targetLabel}`,
  });
  return result.text.trim().slice(0, 320); // keep room for editing
}

function buildChannelChoiceApproval(input: {
  targetLabel: string;
  groupId?: string;
  contactIds?: string[];
}): PendingApproval {
  return {
    id: `approval_${crypto.randomUUID()}`,
    capability: "chooseCampaignChannel",
    summary: `Créer une campagne pour : **${input.targetLabel}**`,
    riskLevel: "low",
    kind: "channelChoice",
    input: {
      targetLabel: input.targetLabel,
      groupId: input.groupId,
      contactIds: input.contactIds,
    },
  };
}

function buildSMSPreviewApproval(input: {
  campaignName: string;
  smsBody: string;
  targetLabel: string;
  groupId?: string;
  contactIds?: string[];
}): PendingApproval {
  return {
    id: `approval_${crypto.randomUUID()}`,
    capability: "createCampaignDraft",
    summary: `Campagne SMS — vérifier le message avant création`,
    targetLabel: input.campaignName,
    riskLevel: "low",
    kind: "smsPreview",
    input: {
      name: input.campaignName,
      channel: "sms",
      smsBody: input.smsBody,
      targetLabel: input.targetLabel,
      groupId: input.groupId,
      contactIds: input.contactIds,
    },
    editableFields: [
      {
        key: "name",
        label: "Nom de la campagne",
        value: input.campaignName,
        placeholder: "Ex: Campagne Femmes Douala — Avril",
      },
      {
        key: "smsBody",
        label: "Contenu du SMS",
        value: input.smsBody,
        placeholder: "Votre message SMS…",
        multiline: true,
      },
    ],
  };
}

function buildSystemPrompt(hasPendingApprovals: boolean) {
  const base = [
    "You are Hermes, an AI assistant embedded in ReachDem — a political campaign CRM.",
    "You are a product assistant, not a generic chatbot.",
    "The backend pre-loads all relevant data before calling you — it is already available in the context below as structured facts and JSON resources. Do NOT invent tool calls, do NOT output <tool_code> blocks, do NOT use function_call syntax. Just respond in plain text or markdown.",
    "CONVERSATION CONTEXT: Always use the conversation history when answering follow-up questions.",
    "If the user refers to 'ces contacts', 'ces résultats', 'ce groupe', or uses 'ces/ces/les mêmes', they mean the contacts or data from the PREVIOUS message — do not ask which ones.",
    "When structured contact or campaign results are present in context, summarize the outcome in one or two short sentences and let the data carry the detail.",
    "For contact discovery requests, reason semantically — the backend runs multiple strategies to find the best match.",
    "When a fallback strategy was used, explain that briefly.",
    "Never claim a write action has already happened if it still needs approval.",
    "Create, edit, send, delete, and launch actions always require user approval.",
    "Respond in the same language as the user (default: French).",
  ].join(" ");

  if (hasPendingApprovals) {
    return `${base} The current request contains a write action — explain clearly what will happen.`;
  }

  return base;
}

function buildPrompt(input: {
  message: string;
  organizationId: string;
  conversationId?: string;
  contextFacts: string[];
  resources: Record<string, unknown>;
  recentTableData?: AITableData;
}) {
  const recentResultsBlock =
    input.recentTableData && input.recentTableData.rows.length > 0
      ? [
          "Recent results (the data shown to the user in the previous message):",
          `Total: ${input.recentTableData.total ?? input.recentTableData.rows.length}`,
          "Rows:",
          ...input.recentTableData.rows.map(
            (r, i) =>
              `  ${i + 1}. ${Object.entries(r)
                .filter(([k]) => k !== "id")
                .map(([k, v]) => `${k}=${v ?? "—"}`)
                .join(", ")}`
          ),
        ].join("\n")
      : null;

  return [
    `Workspace: ${input.organizationId}`,
    input.conversationId ? `Conversation: ${input.conversationId}` : "",
    recentResultsBlock
      ? `=== Recent results ===\n${recentResultsBlock}\n=== End recent results ===`
      : "",
    input.contextFacts.length > 0
      ? `Context facts:\n- ${input.contextFacts.join("\n- ")}`
      : "Context facts: none loaded",
    Object.keys(input.resources).length > 0
      ? `Context resources JSON:\n${JSON.stringify(input.resources, null, 2)}`
      : "",
    `User request:\n${input.message}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ── Group intent detection ────────────────────────────────────────────────────

/**
 * Returns the contact filter embedded in a "create group" request, or null.
 * e.g. "crée un groupe avec les hommes de Douala" → { gender: MALE, q: "Douala" }
 */
function parseCreateGroupIntent(message: string): ContactQueryFilter | null {
  const CREATE_GROUP =
    /\b(crée|cree|créer|créons|creons|faire|create|nouveau?\s+groupe|new\s+group|make\s+a\s+group)\b.{0,60}\b(groupe|group)\b/i;
  const GROUP_FIRST =
    /\b(groupe|group)\b.{0,60}\b(de|avec|with|of|containing|composé|compose)\b/i;

  if (!CREATE_GROUP.test(message) && !GROUP_FIRST.test(message)) return null;

  // Reuse the same contact-filter parser — whatever follows "avec les" is the filter
  // Strip the "create group" verb phrase first so it doesn't interfere
  const stripped = message
    .replace(
      /\b(crée|cree|créer|créons|creons|faire|create|nouveau?|new|make|a|un|une)\b/gi,
      " "
    )
    .replace(/\b(groupe|group)\b/gi, " ")
    .trim();

  return parseContactQuery(stripped) ?? {}; // empty filter = all contacts
}

/**
 * Generate an AI-suggested group name and description from a contact filter
 * and the total contact count. Pure text — no LLM call needed.
 */
function suggestGroupMeta(
  filter: ContactQueryFilter,
  total: number
): { name: string; description: string } {
  const parts: string[] = [];

  if (filter.gender === "MALE") parts.push("Hommes");
  else if (filter.gender === "FEMALE") parts.push("Femmes");

  if (filter.enterprise) parts.push(filter.enterprise);
  if (filter.q) parts.push(filter.q);
  if (filter.hasPhone === true) parts.push("avec tél.");
  if (filter.hasPhone === false) parts.push("sans tél.");
  if (filter.hasEmail === true) parts.push("avec email");
  if (filter.hasEmail === false) parts.push("sans email");

  const name =
    parts.length > 0
      ? parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" · ")
      : "Nouveau groupe";

  const description = `Groupe créé par Hermès — ${total} contact${total !== 1 ? "s" : ""} importé${total !== 1 ? "s" : ""}.`;

  return { name, description };
}

function buildContactQueryText(tableData: AITableData) {
  const total = tableData.total ?? tableData.rows.length;

  if (total === 0) {
    return "Aucun contact correspondant n'a été trouvé. Essaie d'élargir le filtre ou de vérifier l'orthographe.";
  }

  return `Voici ${total} contact${total > 1 ? "s" : ""} correspondant${
    total > 1 ? "s" : ""
  }.`;
}

function buildGroupApproval(
  filter: ContactQueryFilter,
  contactIds: string[],
  total: number
): PendingApproval[] {
  const { name, description } = suggestGroupMeta(filter, total);
  return [
    {
      id: `approval_${crypto.randomUUID()}`,
      capability: "createContactGroup",
      summary: `Créer un groupe avec ${total} contact${total !== 1 ? "s" : ""} ?`,
      riskLevel: "low",
      input: { name, description, contactIds },
      editableFields: [
        {
          key: "name",
          label: "Nom du groupe",
          value: name,
          placeholder: "Ex: Hommes de Douala",
        },
        {
          key: "description",
          label: "Description",
          value: description,
          placeholder: "Description facultative…",
          multiline: true,
        },
      ],
    },
  ];
}

export async function runAIChat(input: {
  userId: string;
  organizationId: string;
  body: AIChatRequest;
}): Promise<AIChatResponse> {
  const context = await buildAIContext({
    organizationId: input.organizationId,
    page: input.body.page,
  });

  let tableData: AITableData | undefined;
  let suggestedActions: AISuggestedAction[] | undefined;
  let deterministicText: string | undefined;
  let pendingApprovals: PendingApproval[] = [];
  const stepTrace: AIStepTrace[] = [];
  let campaignFlowState: AIChatResponse["campaignFlowState"] | undefined;

  const addStep = (
    label: string,
    status: AIStepTrace["status"],
    detail?: string
  ) => {
    stepTrace.push({ label, status, detail });
    context.toolCalls.push({
      capability: label,
      mode: status === "error" ? "read" : "read",
      status: status === "pending" ? "pending_approval" : status,
      label: detail ? `${label} — ${detail}` : label,
    });
  };

  // ── (A) Handle approved write: createContactGroup ─────────────────────────
  if (input.body.requestedAction?.capability === "createContactGroup") {
    const inp = input.body.requestedAction.input as {
      name: string;
      description?: string;
      contactIds: string[];
    };
    try {
      const { groupId, memberCount } = await createContactGroup({
        organizationId: input.organizationId,
        name: inp.name,
        description: inp.description,
        contactIds: inp.contactIds,
      });
      addStep(
        "Création du groupe",
        "success",
        `"${inp.name}" · ${memberCount} membre${memberCount !== 1 ? "s" : ""}`
      );
      deterministicText = `✓ Le groupe **${inp.name}** a été créé avec ${memberCount} contact${memberCount !== 1 ? "s" : ""}.`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addStep("Création du groupe", "error", msg);
      deterministicText = `La création du groupe a échoué : ${msg}`;
    }

    // ── (B) Handle approved write: createCampaignDraft ───────────────────────
  } else if (input.body.requestedAction?.capability === "createCampaignDraft") {
    const inp = input.body.requestedAction.input as {
      name: string;
      channel: "sms" | "email";
      smsBody?: string;
      groupId?: string;
      contactIds?: string[];
      targetLabel?: string;
    };
    try {
      const { campaignId, name } = await createCampaignDraft({
        organizationId: input.organizationId,
        userId: input.userId,
        name: inp.name,
        channel: inp.channel,
        smsBody: inp.smsBody,
        groupId: inp.groupId,
        contactIds: inp.contactIds,
      });
      addStep("Création brouillon de campagne", "success", `"${name}" créée`);
      deterministicText =
        `✓ La campagne **${name}** a été créée en brouillon.\n\n` +
        `Tu peux maintenant la retrouver dans [Campagnes](/campaigns/${campaignId}/edit) pour la finaliser et l'envoyer.`;
      suggestedActions = [
        {
          label: "Ouvrir la campagne",
          href: `/campaigns/${campaignId}/edit`,
          variant: "default",
        },
        {
          label: "Voir toutes les campagnes",
          href: "/campaigns",
          variant: "outline",
        },
      ];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addStep("Création brouillon de campagne", "error", msg);
      deterministicText = `La création de la campagne a échoué : ${msg}`;
    }

    // ── (C) Handle campaign flow state: awaitingTopic → draft SMS ────────────
  } else if (input.body.campaignFlowState?.step === "awaitingTopic") {
    const flow = input.body.campaignFlowState;
    const topic = input.body.message;
    addStep("Réception du sujet", "success", topic.slice(0, 60));

    let smsBody = "";
    try {
      addStep("Rédaction du SMS", "pending");
      smsBody = await draftSMSBodyWithAI({
        userId: input.userId,
        organizationId: input.organizationId,
        topic,
        targetLabel: flow.targetLabel,
      });
      stepTrace[stepTrace.length - 1].status = "success";
      stepTrace[stepTrace.length - 1].detail = `${smsBody.length} caractères`;
    } catch (err) {
      stepTrace[stepTrace.length - 1].status = "error";
      smsBody = "Votre message ici…";
    }

    const campaignName = `Campagne ${flow.targetLabel} — ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
    pendingApprovals = [
      buildSMSPreviewApproval({
        campaignName,
        smsBody,
        targetLabel: flow.targetLabel,
        groupId: flow.groupId,
        contactIds: flow.contactIds,
      }),
    ];
    deterministicText = `Voici le brouillon SMS que j'ai rédigé. Tu peux modifier le nom et le contenu avant de valider :`;

    // ── (D) Handle campaign flow state: awaitingChannel → ask for topic ──────
  } else if (input.body.campaignFlowState?.step === "awaitingChannel") {
    const flow = input.body.campaignFlowState;
    // Channel was chosen — now ask for topic
    const channel = flow.channel ?? "sms";
    campaignFlowState = { ...flow, step: "awaitingTopic", channel };
    deterministicText =
      channel === "sms"
        ? `Super ! Quel est le sujet ou l'objectif de cette campagne SMS ? (ex: "invitation à une réunion", "rappel de vote", "annonce d'événement")`
        : `Parfait ! Quel est le sujet de cette campagne email ?`;

    // ── (E) Campaign creation intent — search group then contacts ─────────────
  } else if (!input.body.requestedAction) {
    const campaignCreationTarget = parseCampaignCreationIntent(
      input.body.message
    );
    const contactFilter =
      campaignCreationTarget === null
        ? parseContactQuery(input.body.message)
        : null;
    const groupIntent =
      campaignCreationTarget === null
        ? parseCreateGroupIntent(input.body.message)
        : null;
    const isCampaignQuery = parseCampaignQuery(input.body.message);

    if (campaignCreationTarget !== null) {
      // Multi-step: 1) search for named group, 2) fallback to contact search
      const targetPhrase = campaignCreationTarget || "femmes";
      let foundGroupId: string | undefined;
      let foundGroupLabel: string | undefined;
      let foundContactIds: string[] | undefined;
      let foundTableData: AITableData | undefined;

      // Step 1: Search for a matching group
      addStep("Recherche du groupe", "pending");
      try {
        const groups = await queryGroups({
          organizationId: input.organizationId,
          nameLike: targetPhrase,
        });
        if (groups.length > 0) {
          const best = groups[0];
          foundGroupId = best.id;
          foundGroupLabel = `${best.name} (${best.memberCount} membres)`;
          stepTrace[stepTrace.length - 1].status = "success";
          stepTrace[stepTrace.length - 1].detail =
            `Groupe "${best.name}" trouvé`;

          foundTableData = {
            columns: [
              { key: "name", label: "Groupe" },
              { key: "memberCount", label: "Membres" },
              { key: "description", label: "Description" },
            ],
            rows: groups.map((g) => ({
              id: g.id,
              name: g.name,
              memberCount: String(g.memberCount),
              description: g.description ?? "—",
            })),
            total: groups.length,
          };
          deterministicText = `J'ai trouvé le groupe **${best.name}** (${best.memberCount} membres). Je vais créer une campagne avec ce groupe.`;
        } else {
          stepTrace[stepTrace.length - 1].status = "success";
          stepTrace[stepTrace.length - 1].detail = "Aucun groupe correspondant";

          // Step 2: Fallback — search contacts by gender/filter
          const fallbackFilter = parseContactQuery(targetPhrase) ?? {
            gender: "FEMALE" as const,
          };
          addStep("Recherche des contacts", "pending");
          const result = await queryContacts({
            organizationId: input.organizationId,
            filter: fallbackFilter,
          });
          stepTrace[stepTrace.length - 1].status = "success";
          stepTrace[stepTrace.length - 1].detail =
            `${result.tableData.total ?? result.tableData.rows.length} trouvé(s)`;

          if ((result.tableData.total ?? 0) > 0) {
            foundContactIds = result.tableData.rows.map((r) => r.id as string);
            foundGroupLabel = `${result.tableData.total} contacts (${targetPhrase})`;
            foundTableData = result.tableData;
            tableData = result.tableData;
            deterministicText = `${buildContactQueryText(result.tableData)} Je vais créer une campagne avec ces contacts.`;
          } else {
            deterministicText =
              "Je n'ai trouvé ni groupe ni contact correspondant à votre demande. Veuillez vérifier le nom ou les critères.";
            tableData = result.tableData;
          }
        }
      } catch (err) {
        stepTrace[stepTrace.length - 1].status = "error";
        deterministicText = `Impossible de rechercher les cibles : ${err instanceof Error ? err.message : String(err)}`;
      }

      // If a target was found, ask for channel choice
      if (foundGroupId || foundContactIds) {
        tableData = foundTableData;
        pendingApprovals = [
          buildChannelChoiceApproval({
            targetLabel: foundGroupLabel ?? targetPhrase,
            groupId: foundGroupId,
            contactIds: foundContactIds,
          }),
        ];
        campaignFlowState = {
          step: "awaitingChannel",
          targetLabel: foundGroupLabel ?? targetPhrase,
          groupId: foundGroupId,
          contactIds: foundContactIds,
        };
        if (!deterministicText?.includes("campagne")) {
          deterministicText =
            (deterministicText ?? "") +
            "\n\nVeux-tu créer une campagne **SMS** ou **Email** ?";
        }
      }
    } else {
      if (isCampaignQuery) {
        try {
          const { listCampaigns } = await import("@reachdem/core").then(
            (m) => ({
              listCampaigns: m.CampaignService.listCampaigns.bind(
                m.CampaignService
              ),
            })
          );
          const list = await listCampaigns(input.organizationId, { limit: 10 });
          const STATUS_LABEL: Record<string, string> = {
            draft: "Brouillon",
            active: "Active",
            completed: "Terminée",
            paused: "En pause",
            scheduled: "Planifiée",
            cancelled: "Annulée",
          };
          const CHANNEL_LABEL: Record<string, string> = {
            sms: "SMS",
            email: "Email",
          };
          const rows = list.items.map((c) => ({
            id: c.id,
            name: c.name,
            channel: CHANNEL_LABEL[c.channel] ?? c.channel,
            status: STATUS_LABEL[c.status] ?? c.status,
            scheduledAt: c.scheduledAt
              ? new Date(c.scheduledAt).toLocaleDateString("fr-FR")
              : "—",
          }));
          tableData = {
            columns: [
              { key: "name", label: "Campagne" },
              { key: "channel", label: "Canal" },
              { key: "status", label: "Statut" },
              { key: "scheduledAt", label: "Planifiée le" },
            ],
            rows,
            total: list.items.length,
            truncated: false,
          };
          const n = list.items.length;
          deterministicText = `Voici ${n > 1 ? `les ${n} campagnes les plus récentes` : "la campagne la plus récente"} :`;
          context.facts.push(
            `${n} campaigns loaded. Do not list them in prose.`
          );
          addStep(
            "Chargement des campagnes",
            "success",
            `${n} campagne${n !== 1 ? "s" : ""}`
          );
          suggestedActions = [
            {
              label: "Ouvrir les campagnes",
              href: "/campaigns",
              variant: "outline",
            },
          ];
        } catch {
          addStep("Chargement des campagnes", "error");
        }
      }

      if (contactFilter !== null) {
        const result = await queryContacts({
          organizationId: input.organizationId,
          filter: contactFilter,
        });
        context.facts.push(...result.facts);
        context.resources.contactResults = result.tableData;
        addStep(
          "Recherche des contacts",
          result.tableData.total ? "success" : "success",
          `${result.tableData.total ?? result.tableData.rows.length} trouvé(s)`
        );
        tableData = result.tableData;
        suggestedActions = result.suggestedActions;
        deterministicText = result.fallbackUsed
          ? (result.tableData.total ?? 0) > 0
            ? `${buildContactQueryText(result.tableData)} Je t'affiche le meilleur résultat trouvé après recherche élargie.`
            : buildContactQueryText(result.tableData)
          : buildContactQueryText(result.tableData);

        if (groupIntent !== null && (result.tableData.total ?? 0) > 0) {
          const contactIds = result.tableData.rows.map((r) => r.id as string);
          const total = result.tableData.total ?? contactIds.length;
          pendingApprovals = buildGroupApproval(
            contactFilter,
            contactIds,
            total
          );
          deterministicText = `J'ai trouvé ${total} contact${total !== 1 ? "s" : ""}. Voici les détails du groupe à créer :`;
          suggestedActions = undefined;
        }
      } else if (
        groupIntent !== null &&
        input.body.recentContactIds &&
        input.body.recentContactIds.length > 0
      ) {
        const contactIds = input.body.recentContactIds;
        const total = input.body.recentContactTotal ?? contactIds.length;
        pendingApprovals = buildGroupApproval({}, contactIds, total);
        deterministicText = `Je vais créer un groupe avec les ${total} contact${total !== 1 ? "s" : ""} de ta dernière recherche :`;
      }
    }
  }

  if (
    !pendingApprovals.length &&
    ![
      "createContactGroup",
      "createCampaignDraft",
      "chooseCampaignChannel",
    ].includes(input.body.requestedAction?.capability ?? "") &&
    input.body.campaignFlowState?.step !== "awaitingTopic" &&
    input.body.campaignFlowState?.step !== "awaitingChannel"
  ) {
    pendingApprovals = detectPendingApprovals({
      message: input.body.message,
      requestedAction: input.body.requestedAction,
    });
  }

  // Only call LLM when there's no deterministic text
  let providerUsed: AIChatResponse["providerUsed"] = "gemini";
  let responseText = deterministicText ?? "";

  if (!deterministicText) {
    const result = await generateAIText({
      userId: input.userId,
      organizationId: input.organizationId,
      providerOverride: input.body.providerOverride,
      system: buildSystemPrompt(pendingApprovals.length > 0),
      prompt: buildPrompt({
        message: input.body.message,
        organizationId: input.organizationId,
        conversationId: input.body.conversationId,
        contextFacts: context.facts,
        resources: context.resources,
        recentTableData: input.body.recentTableData,
      }),
      history: input.body.history,
    });
    responseText = result.text;
    providerUsed = result.providerUsed;
  }

  return {
    text: responseText,
    providerUsed,
    toolCalls:
      stepTrace.length > 0
        ? []
        : pendingApprovals.length > 0
          ? [
              ...context.toolCalls,
              {
                capability: pendingApprovals[0].capability,
                mode: "write",
                status: "pending_approval",
              },
            ]
          : context.toolCalls,
    pendingApprovals,
    contextSummary: context.facts,
    tableData,
    suggestedActions,
    stepTrace: stepTrace.length > 0 ? stepTrace : undefined,
    campaignFlowState,
  };
}
