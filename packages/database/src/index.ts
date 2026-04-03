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

function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");
    const usesLibpqCompat =
      url.searchParams.get("uselibpqcompat")?.toLowerCase() === "true";

    if (
      usesLibpqCompat ||
      !sslMode ||
      sslMode === "disable" ||
      sslMode === "allow" ||
      sslMode === "verify-full"
    ) {
      return connectionString;
    }

    // pg-connection-string v2 treats require/prefer/verify-ca like verify-full.
    // Rewrite to the explicit equivalent so current behavior stays unchanged and
    // the warning disappears ahead of the next major version.
    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  } catch {
    return connectionString;
  }
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

export function resetPrismaClient() {
  prismaInstance = undefined;
  globalForPrisma.prisma = undefined;
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

  const connectionString = normalizeDatabaseUrl(runtime.databaseUrl);

  if (runtime.driver === "neon") {
    const adapter = new PrismaNeon({ connectionString });
    return {
      log,
      adapter,
    };
  }

  const pool = new Pool({ connectionString });

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
