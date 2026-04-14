import { prisma } from "@reachdem/database";

async function run() {
  const systemOrg = await prisma.organization.findFirst();
  console.log(systemOrg);
}

void run();
