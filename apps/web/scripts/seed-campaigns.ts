import { prisma } from "@reachdem/database";
import { CampaignService } from "@reachdem/core";

async function main() {
  console.log("Locating default organization...");

  // Find any existing organization
  const organization = await prisma.organization.findFirst();

  if (!organization) {
    console.error(
      "No organization found in the database. Cannot seed campaigns."
    );
    process.exit(1);
  }

  const organizationId = organization.id;
  console.log(`Using Organization ID: ${organizationId}`);

  console.log("Creating synthetic campaigns...");

  const camp1 = await CampaignService.createCampaign(organizationId, {
    name: "Winter Outreach 2026",
    description: "Cold outreach to potential leads.",
    channel: "sms",
    content: {
      text: "Hi there, winter is coming. Get ready with ReachDem!",
      from: "ReachDem",
    },
  });
  console.log(`Created Campaign: ${camp1.name} (${camp1.id})`);

  const camp2 = await CampaignService.createCampaign(organizationId, {
    name: "VIP Members Alert",
    description: "Exclusive notification for VIP members.",
    channel: "sms",
    content: {
      text: "You are a VIP! Reply to this message to claim your reward.",
      from: "ReachDem",
    },
  });
  console.log(`Created Campaign: ${camp2.name} (${camp2.id})`);

  // Let's create a bunch more to test pagination/listing visually
  for (let i = 1; i <= 5; i++) {
    const camp = await CampaignService.createCampaign(organizationId, {
      name: `Automated Follow-up Batch ${i}`,
      description: `Auto-generated batch ${i} for testing.`,
      channel: "sms",
      content: {
        text: `Hello, this is message batch ${i}. Thank you for subscribing.`,
        from: "ReachDem",
      },
    });
    console.log(`Created Campaign: ${camp.name} (${camp.id})`);
  }

  console.log("Seeding complete! You can now check the UI.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
