import { tool } from "ai";
import { z } from "zod";

/**
 * Write tools have a lightweight `execute` that returns "approval_pending".
 * This lets the AI SDK continue the stream after the tool call.
 * The streaming route intercepts tool-call parts in fullStream and injects
 * [[APPROVAL:{...}]] markers into the text stream, which the client parses
 * into HermesPendingApproval objects for the user to approve or dismiss.
 */

const approvalExecute = async () => "approval_pending" as const;

// ── create_group ──────────────────────────────────────────────────────────────

export const createGroupTool = tool({
  description:
    "Create a new contact group with the given name and members. Use when the user wants to create a group or save a set of contacts. Always ask the user to confirm the group name before creating.",
  inputSchema: z.object({
    name: z.string().min(1).describe("Group name"),
    description: z.string().optional().describe("Optional group description"),
    contactIds: z
      .array(z.string())
      .describe("Array of contact IDs to add to the group"),
    isTemporary: z
      .boolean()
      .optional()
      .describe("True if this is a temporary group for a single campaign send"),
  }),
  execute: approvalExecute,
});

// ── update_group ──────────────────────────────────────────────────────────────

export const updateGroupTool = tool({
  description: "Rename a group or add/remove members. Requires user approval.",
  inputSchema: z.object({
    groupId: z.string().describe("The group ID to update"),
    name: z.string().optional().describe("New group name (if renaming)"),
    description: z.string().optional().describe("New description"),
    addContactIds: z
      .array(z.string())
      .optional()
      .describe("Contact IDs to add"),
    removeContactIds: z
      .array(z.string())
      .optional()
      .describe("Contact IDs to remove"),
  }),
  execute: approvalExecute,
});

// ── delete_group ──────────────────────────────────────────────────────────────

export const deleteGroupTool = tool({
  description:
    "Delete a group permanently. This is irreversible. Requires explicit user confirmation.",
  inputSchema: z.object({
    groupId: z.string().describe("The group ID to delete"),
    groupName: z
      .string()
      .describe("The group name (shown to user for confirmation)"),
  }),
  execute: approvalExecute,
});

// ── create_campaign ───────────────────────────────────────────────────────────

export const createCampaignTool = tool({
  description:
    "Create a new campaign draft. The campaign starts in draft state. Use this after the user has specified a channel (SMS/email), content, and target audience. Requires user approval.",
  inputSchema: z.object({
    name: z.string().describe("Campaign name"),
    channel: z.enum(["sms", "email"]).describe("Delivery channel"),
    smsBody: z
      .string()
      .optional()
      .describe("SMS message body (required if channel is sms)"),
    emailSubject: z
      .string()
      .optional()
      .describe("Email subject (required if channel is email)"),
    emailHtml: z
      .string()
      .optional()
      .describe("Email HTML body (required if channel is email)"),
    groupId: z.string().optional().describe("Target group ID"),
    contactIds: z
      .array(z.string())
      .optional()
      .describe("Target contact IDs (if no groupId)"),
    targetLabel: z
      .string()
      .describe("Human-readable label for the target audience"),
  }),
  execute: approvalExecute,
});

// ── update_campaign ───────────────────────────────────────────────────────────

export const updateCampaignTool = tool({
  description:
    "Update a campaign draft. Only draft campaigns can be edited. Requires user approval.",
  inputSchema: z.object({
    campaignId: z.string().describe("The campaign ID to update"),
    name: z.string().optional().describe("New campaign name"),
    smsBody: z.string().optional().describe("Updated SMS body"),
    emailSubject: z.string().optional().describe("Updated email subject"),
    emailHtml: z.string().optional().describe("Updated email HTML"),
  }),
  execute: approvalExecute,
});

// ── delete_campaign ───────────────────────────────────────────────────────────

export const deleteCampaignTool = tool({
  description:
    "Delete a campaign. Only draft campaigns can be deleted. This is irreversible.",
  inputSchema: z.object({
    campaignId: z.string().describe("The campaign ID to delete"),
    campaignName: z
      .string()
      .describe("Campaign name (shown to user for confirmation)"),
  }),
  execute: approvalExecute,
});

// ── send_sms ──────────────────────────────────────────────────────────────────

export const sendSmsTool = tool({
  description:
    "Send a single transactional SMS to one contact. This is NOT a campaign — it's a one-off message. For bulk sends, use create_campaign instead. Requires user approval.",
  inputSchema: z.object({
    contactId: z.string().describe("The contact ID to send to"),
    contactName: z.string().describe("Contact name (shown in approval card)"),
    message: z.string().min(1).max(1600).describe("The SMS message body"),
    variables: z
      .record(z.string())
      .optional()
      .describe("Values to substitute for {{contact.*}} variables"),
  }),
  execute: approvalExecute,
});

// ── send_email ────────────────────────────────────────────────────────────────

export const sendEmailTool = tool({
  description:
    "Send a transactional email to one or more contacts. Requires user approval. The emailHtml should be final rendered HTML (use craft_email first to get a preview).",
  inputSchema: z.object({
    contactIds: z.array(z.string()).describe("Contact IDs to send to"),
    targetLabel: z.string().describe("Human-readable target description"),
    subject: z.string().describe("Email subject line"),
    emailHtml: z.string().describe("Full HTML email body"),
  }),
  execute: approvalExecute,
});

// ── craft_email ───────────────────────────────────────────────────────────────
// This tool auto-executes on the server (see streaming route) and returns JSX for preview.
// It is listed here as a write tool so it appears in the approval/preview flow.

export const craftEmailTool = tool({
  description:
    "Generate a professional email template as JSX for the user to preview before sending. Use this when the user asks to write or draft an email. The result will be shown as a preview card that the user can edit and approve.",
  inputSchema: z.object({
    prompt: z.string().describe("What the email should be about / say"),
    recipientLabel: z
      .string()
      .describe("Who the email is for (e.g. 'all VIP contacts', 'John')"),
    tone: z
      .enum(["professional", "friendly", "casual", "urgent"])
      .optional()
      .describe("Email tone"),
    contactVars: z
      .array(z.string())
      .optional()
      .describe("Contact variable names to include, e.g. {{contact.name}}"),
  }),
  execute: approvalExecute,
});

// ── Aggregated write tools map ────────────────────────────────────────────────

export function buildWriteTools() {
  return {
    create_group: createGroupTool,
    update_group: updateGroupTool,
    delete_group: deleteGroupTool,
    create_campaign: createCampaignTool,
    update_campaign: updateCampaignTool,
    delete_campaign: deleteCampaignTool,
    send_sms: sendSmsTool,
    send_email: sendEmailTool,
    craft_email: craftEmailTool,
  };
}
