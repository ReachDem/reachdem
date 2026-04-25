import { prisma } from "@reachdem/database";
import { TrackedLinkService } from "./tracked-link.service";

const URL_REGEX =
  /((?:https?:\/\/|www\.|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})(?:[^\s<>"']*))/g;

export class CampaignLinkTrackingService {
  static async preprocessCampaignLinks(
    organizationId: string,
    campaign: {
      id: string;
      channel: "sms" | "email" | "whatsapp";
      content: unknown;
    }
  ): Promise<void> {
    const content = (campaign.content ?? {}) as Record<string, unknown>;
    const channel = campaign.channel;

    const textContent =
      (channel === "sms" || channel === "whatsapp") &&
      typeof content.text === "string"
        ? content.text
        : "";
    const htmlContent =
      channel === "email" && typeof content.html === "string"
        ? content.html
        : "";

    const contentToScan = textContent || htmlContent;
    if (!contentToScan) return;

    const urlsToShorten: string[] = [];
    const matches = contentToScan.matchAll(URL_REGEX);

    for (const match of matches) {
      const url = match[1];
      if (url.includes("rcdm.ink/")) continue;
      if (url.includes("{{") || url.includes("}}")) continue;
      if (!urlsToShorten.includes(url)) {
        urlsToShorten.push(url);
      }
    }

    if (urlsToShorten.length === 0) return;

    const linkMap = new Map<string, string>();

    for (const url of urlsToShorten) {
      try {
        const trackedLink = await TrackedLinkService.createLink(
          organizationId,
          {
            targetUrl: url,
            campaignId: campaign.id,
            channel,
          }
        );
        linkMap.set(url, trackedLink.shortUrl);
      } catch (error) {
        console.error(
          `[CampaignLinkTracking] Failed to create tracked link for ${url}:`,
          error
        );
      }
    }

    if (linkMap.size === 0) return;

    let updatedContent = contentToScan;
    linkMap.forEach((shortUrl, originalUrl) => {
      updatedContent = updatedContent.replace(
        new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        shortUrl
      );
    });

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        content:
          channel === "sms" || channel === "whatsapp"
            ? {
                ...content,
                text: updatedContent,
              }
            : {
                ...content,
                html: updatedContent,
              },
      } as any,
    });
  }
}
