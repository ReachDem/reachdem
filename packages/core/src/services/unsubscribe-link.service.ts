import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@reachdem/database";
import type { MessageChannel } from "@reachdem/shared";
import { TrackedLinkService } from "./tracked-link.service";

interface UnsubscribeTokenPayload {
  organizationId: string;
  contactId: string;
  channel: MessageChannel;
  messageId?: string | null;
}

function getSigningSecret(): string {
  const secret =
    process.env.UNSUBSCRIBE_LINK_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing UNSUBSCRIBE_LINK_SECRET or BETTER_AUTH_SECRET");
  }

  return secret;
}

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export class UnsubscribeLinkService {
  static createToken(payload: UnsubscribeTokenPayload): string {
    const encodedPayload = toBase64Url(JSON.stringify(payload));
    const signature = signPayload(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  static parseToken(token: string): UnsubscribeTokenPayload | null {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = signPayload(encodedPayload);

    if (
      signature.length !== expectedSignature.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return null;
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8")
      ) as UnsubscribeTokenPayload;

      if (
        !parsed.organizationId ||
        !parsed.contactId ||
        (parsed.channel !== "sms" && parsed.channel !== "email")
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  static buildPublicUrl(token: string): string {
    return `${getAppBaseUrl().replace(/\/+$/, "")}/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  static async getOrCreateTrackedLink(params: {
    organizationId: string;
    contactId: string;
    messageId: string;
    channel: MessageChannel;
  }): Promise<string> {
    const token = this.createToken({
      organizationId: params.organizationId,
      contactId: params.contactId,
      messageId: params.messageId,
      channel: params.channel,
    });
    const targetUrl = this.buildPublicUrl(token);

    const existing = await prisma.trackedLink.findFirst({
      where: {
        organizationId: params.organizationId,
        contactId: params.contactId,
        messageId: params.messageId,
        channel: params.channel,
        targetUrl,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return existing.shortUrl;
    }

    const trackedLink = await TrackedLinkService.createLink(
      params.organizationId,
      {
        targetUrl,
        contactId: params.contactId,
        messageId: params.messageId,
        channel: params.channel,
        comment: `Unsubscribe link for ${params.channel}`,
      }
    );

    return trackedLink.shortUrl;
  }

  static appendEmailFooter(html: string, unsubscribeUrl: string): string {
    return `${html}
<hr style="margin-top:24px;border:none;border-top:1px solid #e5e7eb" />
<p style="margin-top:16px;font-size:12px;line-height:18px;color:#6b7280;">
  You can <a href="${unsubscribeUrl}" style="color:#2563eb;">unsubscribe from email</a> at any time.
</p>`;
  }

  static appendSmsFooter(text: string, unsubscribeUrl: string): string {
    return `${text}\n\nStop SMS: ${unsubscribeUrl}`;
  }
}
