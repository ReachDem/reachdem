import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  workers,
  vercelDatabaseEnvironmentsByDeployEnv,
  vercelEnvironmentsByDeployEnv,
} from "./workers-manifest.mjs";

const args = new Set(process.argv.slice(2));
const targetEnv = args.has("--env")
  ? process.argv[process.argv.indexOf("--env") + 1]
  : "staging";
const syncVercel = args.has("--sync-vercel");
const syncVercelDatabase = args.has("--sync-vercel-database");
const databaseOnly = args.has("--database-only");

if (!["staging", "production"].includes(targetEnv)) {
  throw new Error("--env must be staging or production");
}

function readEnvFiles(paths) {
  const values = new Map();
  for (const path of paths) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const rawValue = match[2] ?? "";
      const value = rawValue.replace(/^["']|["']$/g, "");
      if (value && !values.has(key)) {
        values.set(key, value);
      }
    }
  }
  return values;
}

function currentGitBranch() {
  const result = spawnSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return result.stdout.trim();
}

const envValues = readEnvFiles([".env.local", ".env", "apps/web/.env.local"]);

function pick(...keys) {
  for (const key of keys) {
    const value = envValues.get(key);
    if (value) return value;
  }
  return undefined;
}

function pickScoped(name) {
  if (targetEnv === "production") {
    return pick(`${name}_PRODUCTION`, `${name}_PROD`);
  }

  return pick(
    `${name}_STAGING`,
    `${name}_DEVELOPMENT`,
    `${name}_DEV`
  );
}

function runSecretPut(worker, key, value) {
  const result = spawnSync("pnpm", ["exec", "wrangler", "secret", "put", key, "--env", targetEnv], {
    cwd: worker.dir,
    input: `${value}\n`,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `Failed to set ${key} for ${worker.domain}: ${result.stderr || result.stdout}`
    );
  }

  console.log(`[cloudflare] ${worker.domain}: ${key} synced`);
}

function setVercelEnv(name, value, environment) {
  const [vercelEnvironment, gitBranch] = environment.split(":");
  const resolvedBranch = gitBranch === "current" ? currentGitBranch() : gitBranch;
  const scopeArgs = resolvedBranch
    ? [vercelEnvironment, resolvedBranch]
    : [vercelEnvironment];
  spawnSync("vercel", ["env", "rm", name, ...scopeArgs, "--yes"], {
    cwd: "apps/web",
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const result = spawnSync("vercel", ["env", "add", name, ...scopeArgs, "--yes"], {
    cwd: "apps/web",
    input: `${value}\n`,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `Failed to set ${name} for Vercel ${environment}: ${result.error?.message || result.stderr || result.stdout}`
    );
  }

  console.log(`[vercel] ${name} synced for ${environment}`);
}

const common = {
  REACHDEM_WORKER_INTERNAL_SECRET: pick(
    "REACHDEM_WORKER_INTERNAL_SECRET",
    "INTERNAL_API_SECRET"
  ),
  DATABASE_URL: pickScoped("DATABASE_URL"),
  PRISMA_ACCELERATE_URL: pickScoped("PRISMA_ACCELERATE_URL"),
};

if (!common.DATABASE_URL) {
  throw new Error(
    targetEnv === "production"
      ? "Missing DATABASE_URL_PRODUCTION locally. Refusing to fall back to generic DATABASE_URL for production."
      : "Missing DATABASE_URL_STAGING, DATABASE_URL_DEVELOPMENT, or DATABASE_URL_DEV locally. Refusing to fall back to generic DATABASE_URL for staging."
  );
}

const domainSecrets = {
  email: {
    EMAIL_ALIBABA_ACCESS_KEY_ID: pick(
      "EMAIL_ALIBABA_ACCESS_KEY_ID",
      "ALIBABA_ACCESS_KEY_ID"
    ),
    EMAIL_ALIBABA_ACCESS_KEY_SECRET: pick(
      "EMAIL_ALIBABA_ACCESS_KEY_SECRET",
      "ALIBABA_ACCESS_KEY_SECRET"
    ),
    EMAIL_ALIBABA_REGION: pick("EMAIL_ALIBABA_REGION", "ALIBABA_REGION"),
    EMAIL_SENDER_ADDRESS: pick(
      "EMAIL_SENDER_ADDRESS",
      "ALIBABA_SENDER_EMAIL",
      "SENDER_EMAIL"
    ),
    EMAIL_SENDER_NAME: pick(
      "EMAIL_SENDER_NAME",
      "ALIBABA_SENDER_NAME",
      "SENDER_NAME"
    ),
  },
  sms: {
    SMS_AVLYTEXT_API_KEY: pick("SMS_AVLYTEXT_API_KEY", "AVLYTEXT_API_KEY"),
    SMS_MBOA_USER_ID: pick("SMS_MBOA_USER_ID", "MBOA_SMS_USERID"),
    SMS_MBOA_API_PASSWORD: pick(
      "SMS_MBOA_API_PASSWORD",
      "MBOA_SMS_API_PASSWORD"
    ),
    SMS_LMT_API_KEY: pick("SMS_LMT_API_KEY", "LMT_API_KEY"),
    SMS_LMT_SECRET: pick("SMS_LMT_SECRET", "LMT_SECRET"),
  },
  whatsapp: {
    WHATSAPP_EVOLUTION_API_BASE_URL: pick(
      "WHATSAPP_EVOLUTION_API_BASE_URL",
      "EVOLUTION_API_BASE_URL"
    ),
    WHATSAPP_EVOLUTION_API_KEY: pick(
      "WHATSAPP_EVOLUTION_API_KEY",
      "EVOLUTION_API_KEY"
    ),
    WHATSAPP_EVOLUTION_INSTANCE_PREFIX: pick(
      "WHATSAPP_EVOLUTION_INSTANCE_PREFIX",
      "EVOLUTION_INSTANCE_PREFIX"
    ),
  },
  campaign: {},
  scheduler: {},
};

for (const worker of workers) {
  const secrets = databaseOnly
    ? { DATABASE_URL: common.DATABASE_URL }
    : { ...common, ...(domainSecrets[worker.domain] ?? {}) };
  for (const [key, value] of Object.entries(secrets)) {
    if (!value) {
      console.log(`[cloudflare] ${worker.domain}: ${key} missing locally`);
      continue;
    }
    runSecretPut(worker, key, value);
  }
}

if (syncVercel) {
  const internalSecret = common.REACHDEM_WORKER_INTERNAL_SECRET;
  if (!internalSecret) {
    throw new Error("Missing REACHDEM_WORKER_INTERNAL_SECRET/INTERNAL_API_SECRET locally");
  }

  for (const vercelEnv of vercelEnvironmentsByDeployEnv[targetEnv]) {
    setVercelEnv("REACHDEM_WORKER_INTERNAL_SECRET", internalSecret, vercelEnv);
  }
}

if (syncVercelDatabase) {
  for (const vercelEnv of vercelDatabaseEnvironmentsByDeployEnv[targetEnv]) {
    setVercelEnv("DATABASE_URL", common.DATABASE_URL, vercelEnv);
  }
}
