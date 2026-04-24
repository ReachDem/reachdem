import { NextResponse } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@reachdem/auth/guards";
import {
  createContactGroup,
  updateGroup,
  deleteGroupById,
  createCampaignDraft,
  updateCampaignContent,
  deleteCampaignById,
  sendSingleSMS,
  sendSingleEmail,
} from "@/lib/ai/capabilities";

const requestSchema = z.object({
  toolName: z.string(),
  args: z.record(z.unknown()),
});

export const POST = withWorkspace(async ({ req, userId, organizationId }) => {
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { toolName, args } = parsed.data;

  try {
    let result: unknown;

    switch (toolName) {
      case "create_group": {
        const a = args as {
          name: string;
          description?: string;
          contactIds?: string[];
          isTemporary?: boolean;
        };
        result = await createContactGroup({
          organizationId,
          name: a.name,
          description: a.description,
          contactIds: a.contactIds ?? [],
        });
        break;
      }

      case "update_group": {
        const a = args as {
          groupId: string;
          name?: string;
          description?: string;
          addContactIds?: string[];
          removeContactIds?: string[];
        };
        await updateGroup({
          organizationId,
          groupId: a.groupId,
          name: a.name,
          description: a.description,
          addContactIds: a.addContactIds,
          removeContactIds: a.removeContactIds,
        });
        result = { ok: true };
        break;
      }

      case "delete_group": {
        const a = args as { groupId: string };
        await deleteGroupById({ organizationId, groupId: a.groupId });
        result = { ok: true };
        break;
      }

      case "create_campaign": {
        const a = args as {
          name: string;
          channel: "sms" | "email";
          smsBody?: string;
          emailSubject?: string;
          emailHtml?: string;
          groupId?: string;
          contactIds?: string[];
          targetLabel: string;
        };
        result = await createCampaignDraft({
          organizationId,
          userId,
          name: a.name,
          channel: a.channel,
          smsBody: a.smsBody,
          groupId: a.groupId,
          contactIds: a.contactIds,
        });
        break;
      }

      case "update_campaign": {
        const a = args as {
          campaignId: string;
          name?: string;
          smsBody?: string;
          emailSubject?: string;
          emailHtml?: string;
        };
        await updateCampaignContent({
          organizationId,
          campaignId: a.campaignId,
          name: a.name,
          smsBody: a.smsBody,
          emailSubject: a.emailSubject,
          emailHtml: a.emailHtml,
        });
        result = { ok: true };
        break;
      }

      case "delete_campaign": {
        const a = args as { campaignId: string };
        await deleteCampaignById({ organizationId, campaignId: a.campaignId });
        result = { ok: true };
        break;
      }

      case "send_sms": {
        const a = args as { contactId: string; message: string };
        result = await sendSingleSMS({
          organizationId,
          contactId: a.contactId,
          message: a.message,
          userId,
        });
        break;
      }

      case "send_email": {
        const a = args as {
          contactIds: string[];
          subject: string;
          emailHtml: string;
        };
        // Send to each contact sequentially
        const results = await Promise.allSettled(
          a.contactIds.map((contactId) =>
            sendSingleEmail({
              organizationId,
              contactId,
              subject: a.subject,
              htmlBody: a.emailHtml,
              userId,
            })
          )
        );
        const sent = results.filter((r) => r.status === "fulfilled").length;
        result = { sent, total: a.contactIds.length };
        break;
      }

      case "craft_email": {
        // craft_email is a preview-only tool — no server action needed
        result = { ok: true, note: "Email crafted for preview" };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown tool: ${toolName}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error(`[POST /api/ai/chat/execute] toolName=${toolName}`, error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
