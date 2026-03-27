import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";

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

  if (process.env.PRISMA_DB_DRIVER === "neon") {
    return {
      log,
      adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
    };
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  return {
    log,
    adapter: new PrismaPg(pool),
  };
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient(createClientOptions() as Prisma.PrismaClientOptions);
}

let prismaInstance: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }

  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver);
  },
  set(_target, property, value, receiver) {
    return Reflect.set(getPrismaClient(), property, value, receiver);
  },
}) as PrismaClient;

export { Prisma, PrismaClient, Gender, ContactFieldType } from "@prisma/client";
export type * from "@prisma/client";
