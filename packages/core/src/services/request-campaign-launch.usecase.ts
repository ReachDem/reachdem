import { prisma } from "@reachdem/database";
import type { CampaignLaunchJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { TrackedLinkService } from "./tracked-link.service";
import {
  CampaignInvalidStatusError,
  CampaignNotFoundError,
} from "../errors/campaign.errors";

// URL regex to detect links in campaign content
const URL_REGEX =
  /((?:https?:\/\/|www\.|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})(?:[^\s<>"']*))/g;

export class RequestCampaignLaunchUseCase {
  static async execute(
    organizationId: string,
    campaignId: string,
    publishCampaignLaunchJob: (job: CampaignLaunchJob) => Promise<void>
  ): Promise<void> {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new CampaignNotFoundError();
    }

    if (campaign.status !== "draft") {
      throw new CampaignInvalidStatusError(
        `Cannot launch campaign in status '${campaign.status}'. Must be 'draft'.`
      );
    }

    // Pre-process links before launching
    await this.preprocessLinks(organizationId, campaign);

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "running" },
    });

    await publishCampaignLaunchJob({
      campaign_id: campaignId,
      organization_id: organizationId,
    });

    await ActivityLogger.log({
      organizationId,
      actorType: "system",
      actorId: "system",
      category: campaign.channel === "email" ? "email" : "sms",
      action: "updated",
      resourceType: "campaign",
      resourceId: campaignId,
      status: "success",
      meta: {
        message: `Campaign ${campaign.name} queued for worker launch`,
      },
    });
  }

  private static async preprocessLinks(
    organizationId: string,
    campaign: any
  ): Promise<void> {
    const content = campaign.content as any;
    let textContent = "";
    let htmlContent = "";
    const channel = campaign.channel as "sms" | "email";

    // Extract text content based on channel
    if (channel === "sms" && content?.text) {
      textContent = content.text;
    } else if (channel === "email" && content?.html) {
      htmlContent = content.html;
    }

    // Find all URLs that are NOT already rcdm.ink links
    const urlsToShorten: string[] = [];
    const contentToScan = textContent || htmlContent;

    if (!contentToScan) return;

    const matches = contentToScan.matchAll(URL_REGEX);
    for (const match of matches) {
      const url = match[1];
      // Skip if already a shortened rcdm.ink link
      if (url.includes("rcdm.ink/")) continue;
      // Skip variables
      if (url.includes("{{") || url.includes("}}")) continue;

      if (!urlsToShorten.includes(url)) {
        urlsToShorten.push(url);
      }
    }

    // Create tracked links for each URL
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
          `[RequestCampaignLaunch] Failed to create tracked link for ${url}:`,
          error
        );
        // Continue with other links even if one fails
      }
    }

    // Replace URLs in content
    if (linkMap.size > 0) {
      let updatedContent = contentToScan;
      linkMap.forEach((shortUrl, originalUrl) => {
        updatedContent = updatedContent.replace(
          new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          shortUrl
        );
      });

      // Update campaign content
      if (channel === "sms") {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            content: {
              ...content,
              text: updatedContent,
            },
          },
        });
      } else if (channel === "email") {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            content: {
              ...content,
              html: updatedContent,
            },
          },
        });
      }
    }
  }
}
