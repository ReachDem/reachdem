import { Prisma, PrismaClient } from "@prisma/client";
import { createRequire } from "node:module";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";

function getNodeRequire(): ((id: string) => unknown) | null {
  const moduleUrl =
    typeof import.meta !== "undefined" &&
    typeof import.meta.url === "string" &&
    import.meta.url.length > 0
      ? import.meta.url
      : null;

  if (!moduleUrl) {
    return null;
  }

  try {
    return createRequire(moduleUrl);
  } catch {
    return null;
  }
}

const require = getNodeRequire();

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

  if (process.env.DATABASE_URL && typeof WebSocketPair !== "undefined") {
    // TODO: keep this worker-safe path in sync with the production worker
    // runtime. It lets Cloudflare Workers use Prisma without the Node pg pool.
    const sql = neon(process.env.DATABASE_URL);

    return {
      log,
      adapter: new PrismaNeon(sql),
    };
  }

  try {
    if (!require) {
      return { log };
    }

    const { Pool } = require("pg") as {
      Pool: new (options: { connectionString?: string }) => unknown;
    };
    const { PrismaPg } = require("@prisma/adapter-pg") as {
      PrismaPg: new (pool: unknown) => Prisma.PrismaClientOptions["adapter"];
    };
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    return {
      log,
      adapter: new PrismaPg(pool),
    };
  } catch {
    // Fallback for environments that haven't installed driver adapter deps yet.
    return { log };
  }
}

function getOrCreatePrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // TODO: keep Prisma initialization lazy. Cloudflare validates worker bundles
  // before runtime secrets are injected, so eager construction breaks deploys.
  const client = new PrismaClient(
    createClientOptions() as Prisma.PrismaClientOptions
  );
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getOrCreatePrismaClient() as Record<PropertyKey, unknown>;
    const value = Reflect.get(client, prop, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;

export { Prisma, PrismaClient, Gender, ContactFieldType } from "@prisma/client";
export type * from "@prisma/client";
