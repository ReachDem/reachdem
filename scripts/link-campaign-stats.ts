/**
 * Script to associate existing tracked links with their campaigns
 *
 * This script:
 * 1. Finds all campaigns with rcdm.ink links in their content
 * 2. Extracts the slugs from the content
 * 3. Associates those tracked links with the campaign
 * 4. Syncs stats from Sink API for each link
 */

import { prisma } from "@reachdem/database";
import { SinkClient } from "@reachdem/core";

async function linkCampaignStats() {
  console.log("Starting campaign stats linking...\n");

  // Get all campaigns
  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true,
      name: true,
      organizationId: true,
      channel: true,
      content: true,
    },
  });

  console.log(`Found ${campaigns.length} campaigns to process\n`);

  let totalLinksAssociated = 0;
  let totalStatsUpdated = 0;

  for (const campaign of campaigns) {
    console.log(`\n--- Processing: ${campaign.name} (${campaign.id}) ---`);

    // Extract text content
    let textContent = "";
    const content = campaign.content as any;

    if (content?.text) {
      textContent = content.text;
    } else if (content?.html) {
      textContent = content.html;
    }

    if (!textContent) {
      console.log("  No text content found, skipping");
      continue;
    }

    // Find all rcdm.ink links
    const rcdmLinkRegex = /rcdm\.ink\/([a-zA-Z0-9]{4})/g;
    const matches = [...textContent.matchAll(rcdmLinkRegex)];

    if (matches.length === 0) {
      console.log("  No rcdm.ink links found");
      continue;
    }

    console.log(
      `  Found ${matches.length} link(s): ${matches.map((m) => m[1]).join(", ")}`
    );

    for (const match of matches) {
      const slug = match[1];

      try {
        // Find the tracked link in database
        const trackedLink = await prisma.trackedLink.findFirst({
          where: {
            organizationId: campaign.organizationId,
            slug,
          },
        });

        if (!trackedLink) {
          console.log(`  ⚠️  Link ${slug} not found in database`);
          continue;
        }

        // Associate with campaign if not already associated
        if (!trackedLink.campaignId) {
          await prisma.trackedLink.update({
            where: { id: trackedLink.id },
            data: {
              campaignId: campaign.id,
              channel: campaign.channel,
            },
          });
          console.log(`  ✓ Associated link ${slug} with campaign`);
          totalLinksAssociated++;
        } else if (trackedLink.campaignId === campaign.id) {
          console.log(`  → Link ${slug} already associated`);
        } else {
          console.log(
            `  ⚠️  Link ${slug} already associated with another campaign`
          );
        }

        // Sync stats from Sink API
        try {
          const counters = await SinkClient.getCountersBySlug(slug);
          await prisma.trackedLink.update({
            where: { id: trackedLink.id },
            data: {
              totalClicks: counters.totalClicks,
              uniqueClicks: counters.uniqueClicks,
              lastStatsSyncAt: new Date(),
            },
          });
          console.log(
            `  ✓ Updated stats for ${slug}: ${counters.totalClicks} clicks, ${counters.uniqueClicks} unique`
          );
          totalStatsUpdated++;
        } catch (error) {
          console.log(
            `  ⚠️  Failed to sync stats for ${slug}:`,
            error instanceof Error ? error.message : error
          );
        }
      } catch (error) {
        console.error(`  ✗ Error processing link ${slug}:`, error);
      }
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total links associated: ${totalLinksAssociated}`);
  console.log(`Total stats updated: ${totalStatsUpdated}`);
  console.log("\nDone!");
}

// Run the script
linkCampaignStats()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
