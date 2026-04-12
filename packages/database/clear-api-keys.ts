import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe('DELETE FROM "api_key"');
    console.log("Deleted old rows from api_key");
  } catch (e) {
    console.error(e);
  }
}

run();
