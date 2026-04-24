import { tool } from "ai";
import { z } from "zod";
import { queryContacts, queryGroups } from "@/lib/ai/capabilities";
import { CampaignService, ContactService } from "@reachdem/core";
import { prisma } from "@reachdem/database";

// ── search_contacts ───────────────────────────────────────────────────────────

export const searchContactsTool = (organizationId: string) =>
  tool({
    description:
      "Search contacts in the workspace. Use this when the user asks to find, list, or show contacts. Supports filtering by gender, email/phone presence, date added, and free-text search.",
    inputSchema: z.object({
      q: z
        .string()
        .optional()
        .describe("Free-text search (name, email, phone, address, company)"),
      gender: z
        .enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"])
        .optional()
        .describe("Filter by gender"),
      hasPhone: z
        .boolean()
        .optional()
        .describe("Filter contacts with/without a phone number"),
      hasEmail: z
        .boolean()
        .optional()
        .describe("Filter contacts with/without an email"),
      enterprise: z
        .string()
        .optional()
        .describe("Filter by company/enterprise name"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Max rows to return, default 15"),
      createdBefore: z
        .string()
        .optional()
        .describe("ISO date string — contacts added before this date"),
      createdAfter: z
        .string()
        .optional()
        .describe("ISO date string — contacts added after this date"),
    }),
    execute: async (params: {
      q?: string;
      gender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
      hasPhone?: boolean;
      hasEmail?: boolean;
      enterprise?: string;
      limit?: number;
      createdBefore?: string;
      createdAfter?: string;
    }) => {
      const filter = {
        ...params,
        createdBefore: params.createdBefore
          ? new Date(params.createdBefore)
          : undefined,
        createdAfter: params.createdAfter
          ? new Date(params.createdAfter)
          : undefined,
      };
      const result = await queryContacts({ organizationId, filter });
      return {
        total: result.tableData.total ?? result.tableData.rows.length,
        rows: result.tableData.rows,
        columns: result.tableData.columns,
        truncated: result.tableData.truncated ?? false,
        strategyUsed: result.chosenStrategyLabel,
      };
    },
  });

// ── get_contact ───────────────────────────────────────────────────────────────

export const getContactTool = (organizationId: string) =>
  tool({
    description: "Get full details of a single contact by ID.",
    inputSchema: z.object({
      contactId: z.string().describe("The contact's unique ID"),
    }),
    execute: async ({ contactId }) => {
      const contact = await ContactService.getContactById(
        contactId,
        organizationId
      );
      return { contact };
    },
  });

// ── list_groups ───────────────────────────────────────────────────────────────

export const listGroupsTool = (organizationId: string) =>
  tool({
    description:
      "Search and list groups/audiences in the workspace. Use when the user asks about groups, segments, or audience lists.",
    inputSchema: z.object({
      nameLike: z
        .string()
        .optional()
        .describe(
          "Partial group name to search for (case-insensitive). Leave empty to list all recent groups."
        ),
      limit: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Max groups to return, default 10"),
    }),
    execute: async ({ nameLike = "", limit = 10 }) => {
      const groups = await queryGroups({ organizationId, nameLike });
      return {
        total: groups.length,
        groups: groups.slice(0, limit),
      };
    },
  });

// ── list_campaigns ────────────────────────────────────────────────────────────

export const listCampaignsTool = (organizationId: string) =>
  tool({
    description:
      "List recent campaigns in the workspace. Use when the user asks about campaigns.",
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Max campaigns to return, default 10"),
      status: z
        .enum([
          "draft",
          "active",
          "completed",
          "paused",
          "scheduled",
          "cancelled",
        ])
        .optional()
        .describe("Filter by status"),
    }),
    execute: async ({
      limit = 10,
      status,
    }: {
      limit?: number;
      status?:
        | "draft"
        | "active"
        | "completed"
        | "paused"
        | "scheduled"
        | "cancelled";
    }) => {
      const list = await CampaignService.listCampaigns(organizationId, {
        limit,
      });
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
      let items = list.items;
      if (status) items = items.filter((c) => c.status === status);
      return {
        total: items.length,
        campaigns: items.map((c) => ({
          id: c.id,
          name: c.name,
          channel: CHANNEL_LABEL[c.channel] ?? c.channel,
          status: STATUS_LABEL[c.status] ?? c.status,
          scheduledAt: c.scheduledAt
            ? new Date(c.scheduledAt).toLocaleDateString("fr-FR")
            : null,
        })),
      };
    },
  });

// ── get_campaign ──────────────────────────────────────────────────────────────

export const getCampaignTool = (organizationId: string) =>
  tool({
    description: "Get full details of a single campaign by ID.",
    inputSchema: z.object({
      campaignId: z.string().describe("The campaign's unique ID"),
    }),
    execute: async ({ campaignId }) => {
      const campaign = await CampaignService.getCampaign(
        organizationId,
        campaignId
      );
      return { campaign };
    },
  });

// ── list_all_groups ───────────────────────────────────────────────────────────

export const listAllGroupsTool = (organizationId: string) =>
  tool({
    description:
      "List all groups with member counts. Use when building campaign audiences.",
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Max results, default 20"),
    }),
    execute: async ({ limit = 20 }) => {
      const groups = await prisma.group.findMany({
        where: { organizationId },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return {
        total: groups.length,
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          memberCount: g._count.members,
        })),
      };
    },
  });

// ── Aggregated read tools map (for easy spreading into streamText) ─────────────

export function buildReadTools(organizationId: string) {
  return {
    search_contacts: searchContactsTool(organizationId),
    get_contact: getContactTool(organizationId),
    list_groups: listGroupsTool(organizationId),
    list_all_groups: listAllGroupsTool(organizationId),
    list_campaigns: listCampaignsTool(organizationId),
    get_campaign: getCampaignTool(organizationId),
  };
}
