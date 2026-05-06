import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { workers, vercelSecretEnvs } from "./workers-manifest.mjs";

function readEnvFile(path) {
  if (!existsSync(path)) return new Set();
  const keys = new Set();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key] = trimmed.split("=");
    if (key) keys.add(key);
  }
  return keys;
}

function runOptional(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

const localEnvKeys = new Set([
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...readEnvFile("apps/web/.env.local"),
]);

const expectedVercelKeys = [
  ...workers.map((worker) => worker.vercelUrlEnv),
  ...vercelSecretEnvs,
];

console.log("Worker environment audit");
console.log("========================");
console.log("");
console.log("Local/Vercel-facing variables:");
for (const key of expectedVercelKeys) {
  console.log(`- ${key}: ${localEnvKeys.has(key) ? "present locally" : "missing locally"}`);
}

console.log("");
console.log("Cloudflare secret manifest by worker:");
for (const worker of workers) {
  console.log(`- ${worker.domain} (${worker.dir})`);
  for (const key of worker.cloudflareSecrets) {
    console.log(`  - ${key}`);
  }
}

console.log("");
const vercelList = runOptional("vercel", ["env", "ls"], "apps/web");
console.log(
  vercelList.ok
    ? "Vercel env list command succeeded."
    : "Vercel env list command failed or is not authenticated."
);

for (const worker of workers) {
  const wranglerCheck = runOptional("pnpm", ["--filter", worker.packageName, "check"]);
  console.log(
    `${worker.domain} wrangler check: ${wranglerCheck.ok ? "ok" : "failed"}`
  );
}
