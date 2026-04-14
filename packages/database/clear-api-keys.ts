import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  try {
    const result = await prisma.apiKey.deleteMany();
    console.log(`Deleted ${result.count} rows from api_key`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
