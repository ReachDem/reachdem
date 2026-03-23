import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClientOptions(): Prisma.PrismaClientOptions & {
  accelerateUrl?: string;
} {
  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"];

  if (process.env.PRISMA_ACCELERATE_URL) {
    return {
      log,
      accelerateUrl: process.env.PRISMA_ACCELERATE_URL,
    } as Prisma.PrismaClientOptions & { accelerateUrl: string };
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Missing DATABASE_URL. Provide DATABASE_URL or PRISMA_ACCELERATE_URL."
    );
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  return {
    log,
    adapter: new PrismaPg(pool),
  };
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(createClientOptions() as Prisma.PrismaClientOptions);

// const hasRequiredDelegates = (client: PrismaClient) =>
//     Boolean((client as any).group && (client as any).contact && (client as any).organization)

// const existingClient = globalForPrisma.prisma

// export const prisma =
//     existingClient && hasRequiredDelegates(existingClient)
//         ? existingClient
//         : createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { Prisma, PrismaClient, Gender, ContactFieldType } from "@prisma/client";
export type * from "@prisma/client";
