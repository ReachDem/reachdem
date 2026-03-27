import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRuntimeConfig:
    | {
        databaseUrl?: string;
        prismaAccelerateUrl?: string;
        nodeEnv?: string;
        driver?: "pg" | "neon";
      }
    | undefined;
};

function readRuntimeConfig() {
  return {
    databaseUrl:
      globalForPrisma.prismaRuntimeConfig?.databaseUrl ??
      process.env.DATABASE_URL,
    prismaAccelerateUrl:
      globalForPrisma.prismaRuntimeConfig?.prismaAccelerateUrl ??
      process.env.PRISMA_ACCELERATE_URL,
    nodeEnv:
      globalForPrisma.prismaRuntimeConfig?.nodeEnv ?? process.env.NODE_ENV,
    driver:
      globalForPrisma.prismaRuntimeConfig?.driver ??
      (process.env.PRISMA_DB_DRIVER as "pg" | "neon" | undefined) ??
      "pg",
  };
}

export function configureDatabaseRuntime(input: {
  databaseUrl?: string;
  prismaAccelerateUrl?: string;
  nodeEnv?: string;
  driver?: "pg" | "neon";
}) {
  globalForPrisma.prismaRuntimeConfig = {
    ...globalForPrisma.prismaRuntimeConfig,
    ...input,
  };
}

function createClientOptions(): Prisma.PrismaClientOptions & {
  accelerateUrl?: string;
} {
  const runtime = readRuntimeConfig();
  const log: Prisma.LogLevel[] =
    runtime.nodeEnv === "development" ? ["query", "error", "warn"] : ["error"];

  if (runtime.prismaAccelerateUrl) {
    return {
      log,
      accelerateUrl: runtime.prismaAccelerateUrl,
    } as Prisma.PrismaClientOptions & { accelerateUrl: string };
  }

  if (!runtime.databaseUrl) {
    throw new Error(
      "Missing DATABASE_URL. Provide DATABASE_URL or PRISMA_ACCELERATE_URL."
    );
  }

  if (runtime.driver === "neon") {
    const adapter = new PrismaNeon({ connectionString: runtime.databaseUrl });
    return {
      log,
      adapter,
    };
  }

  const pool = new Pool({ connectionString: runtime.databaseUrl });

  return {
    log,
    adapter: new PrismaPg(pool),
  };
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient(
      createClientOptions() as Prisma.PrismaClientOptions
    );
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;

// const hasRequiredDelegates = (client: PrismaClient) =>
//     Boolean((client as any).group && (client as any).contact && (client as any).organization)

// const existingClient = globalForPrisma.prisma

// export const prisma =
//     existingClient && hasRequiredDelegates(existingClient)
//         ? existingClient
//         : createPrismaClient()

if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
  globalForPrisma.prisma = getPrismaClient();
}

export { Prisma, PrismaClient, Gender, ContactFieldType } from "@prisma/client";
export type * from "@prisma/client";
