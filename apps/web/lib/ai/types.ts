export type AIProvider = "gemini" | "openai";

export type AICapabilityMode = "read" | "write";

export interface AIPageContext {
  pageType?: string;
  resourceType?: "contact" | "campaign" | "message" | string;
  resourceId?: string;
}

export interface AIToolExecutionRecord {
  capability: string;
  mode: AICapabilityMode;
  status: "success" | "pending_approval" | "skipped" | "error";
  /** Human-readable result label, e.g. "Searched contacts · 12 found" */
  label?: string;
}

// ── Structured data ───────────────────────────────────────────────────────────

export interface AITableColumn {
  key: string;
  label: string;
  /** How to render the cell value */
  type?: "text" | "badge" | "link";
}

export interface AITableData {
  columns: AITableColumn[];
  rows: Record<string, unknown>[];
  /** Total count in the DB (may exceed rows.length) */
  total?: number;
  truncated?: boolean;
}

export interface AISuggestedAction {
  label: string;
  /** Pre-fill a message in the input and send it */
  message?: string;
  /** Navigate to this URL */
  href?: string;
  variant?: "default" | "outline";
}

export interface PendingApproval {
  id: string;
  capability: string;
  summary: string;
  targetLabel?: string;
  input?: unknown;
  riskLevel: "low" | "medium" | "high";
  /**
   * Special card kind for richer interactions beyond simple approve/dismiss.
   * - "channelChoice"   : ask user to pick SMS or Email
   * - "smsPreview"      : show editable SMS body + confirm/edit
   * - "campaignConfirm" : final confirm to create the campaign draft
   * - "emailPreview"    : show AI-generated JSX email preview with edit mode
   */
  kind?: "channelChoice" | "smsPreview" | "campaignConfirm" | "emailPreview";
  /** JSX string for emailPreview kind */
  emailJsx?: string;
  /** Subject line for emailPreview kind */
  emailSubject?: string;
  /**
   * Fields the user can edit before approving.
   * The current values are merged into `input` when the user approves.
   */
  editableFields?: {
    key: string;
    label: string;
    value: string;
    placeholder?: string;
    multiline?: boolean;
  }[];
}

/** A single step in the agentic reasoning chain */
export interface AIStepTrace {
  label: string;
  status: "success" | "error" | "pending";
  detail?: string;
}

export interface AISettingsPayload {
  preferredProvider: AIProvider;
  openaiApiKeyConfigured: boolean;
  availableProviders: AIProvider[];
  voiceEnabled: boolean;
  elevenlabsAgentId: string | null;
}

export interface AIChatRequest {
  message: string;
  conversationId?: string;
  providerOverride?: AIProvider;
  page?: AIPageContext;
  /** Previous turns sent from the client for multi-turn context */
  history?: { role: "user" | "assistant"; content: string }[];
  /**
   * Contact IDs from the most recent search result.
   * Sent so the orchestrator can create a group from prior results
   * without needing to re-run the query.
   */
  recentContactIds?: string[];
  recentContactTotal?: number;
  /** Campaign IDs from the most recent campaign listing */
  recentCampaignIds?: string[];
  /** Full table rows from the most recent result shown to the user (for LLM context) */
  recentTableData?: AITableData;
  /**
   * Carries ongoing campaign creation state across turns.
   * Set by the orchestrator and echoed back by the client on follow-up messages.
   */
  campaignFlowState?: {
    step: "awaitingChannel" | "awaitingTopic" | "awaitingConfirm";
    targetLabel: string;
    groupId?: string;
    contactIds?: string[];
    channel?: "sms" | "email";
    topic?: string;
    smsBody?: string;
  };
  requestedAction?: {
    capability: string;
    summary: string;
    targetLabel?: string;
    input?: unknown;
  };
}

export interface AIChatResponse {
  text: string;
  providerUsed: AIProvider;
  toolCalls: AIToolExecutionRecord[];
  pendingApprovals: PendingApproval[];
  contextSummary: string[];
  /** Structured table to render in the chat */
  tableData?: AITableData;
  /** Action pills rendered below the message */
  suggestedActions?: AISuggestedAction[];
  /** Ordered chain of reasoning steps for the accordion trace */
  stepTrace?: AIStepTrace[];
  /** Campaign creation flow state — echoed back by client on next turn */
  campaignFlowState?: AIChatRequest["campaignFlowState"];
}

export interface AIContextSnapshot {
  facts: string[];
  resources: Record<string, unknown>;
  toolCalls: AIToolExecutionRecord[];
}

export interface AISettingsUpdateInput {
  preferredProvider?: AIProvider;
  openaiApiKey?: string | null;
  voiceEnabled?: boolean;
  elevenlabsAgentId?: string | null;
}

// ── Hermes streaming types ────────────────────────────────────────────────────

/** Contact variable names Hermes can reference in templates */
export type HermesContactVar =
  | "{{contact.name}}"
  | "{{contact.firstName}}"
  | "{{contact.lastName}}"
  | "{{contact.email}}"
  | "{{contact.phone}}"
  | "{{contact.company}}";

/** Group variable names */
export type HermesGroupVar = "{{group.name}}";

/** A crafted email draft returned by the craft_email tool */
export interface HermesEmailDraft {
  subject: string;
  jsx: string;
  targetLabel?: string;
  groupId?: string;
  contactIds?: string[];
}

/** Navigation targets Hermes can route to */
export type HermesNavTarget =
  | "/contacts"
  | "/campaigns"
  | "/campaigns/new"
  | "/settings"
  | "/dashboard"
  | string;

/** Context summary for history compaction */
export interface HermesConversationSummary {
  summary: string;
  turnCount: number;
}

/** Streaming chat request (new endpoint) */
export interface HermesChatRequest {
  message: string;
  page?: AIPageContext;
  history?: { role: "user" | "assistant"; content: string }[];
  conversationSummary?: string;
}
