import { spawnSync } from "node:child_process";
import { workers, vercelEnvironmentsByDeployEnv } from "./workers-manifest.mjs";

const args = new Set(process.argv.slice(2));
const targetEnv = args.has("--env")
  ? process.argv[process.argv.indexOf("--env") + 1]
  : "staging";
const syncVercel = args.has("--sync-vercel");

if (!["staging", "production"].includes(targetEnv)) {
  throw new Error("--env must be staging or production");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    shell: process.platform === "win32",
    cwd: options.cwd,
    input: options.input,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }

  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function currentGitBranch() {
  const result = spawnSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return result.stdout.trim();
}

function extractUrl(output, workerName) {
  const matches = output.match(/https:\/\/[^\s"'<>]+/g) ?? [];
  return (
    matches.find((url) => url.includes(workerName)) ??
    `https://${workerName}.workers.dev`
  );
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
  run("vercel", ["env", "add", name, ...scopeArgs, "--value", value, "--yes"], {
    cwd: "apps/web",
  });
}

const deployedUrls = [];

for (const worker of workers) {
  const output = run("pnpm", [`--filter`, worker.packageName, `deploy:${targetEnv}`], {
    capture: true,
  });
  const workerName = worker.workerNames[targetEnv];
  const url = extractUrl(output, workerName);
  deployedUrls.push({ ...worker, url });
  console.log(`[workers] ${worker.domain} deployed: ${url}`);
}

if (syncVercel) {
  for (const item of deployedUrls) {
    for (const vercelEnv of vercelEnvironmentsByDeployEnv[targetEnv]) {
      setVercelEnv(item.vercelUrlEnv, item.url, vercelEnv);
      console.log(`[vercel] ${item.vercelUrlEnv} synced for ${vercelEnv}`);
    }
  }

  run("vercel", ["env", "pull", ".env.local", "--yes"], {
    cwd: "apps/web",
  });
}

console.log(
  JSON.stringify(
    {
      environment: targetEnv,
      syncVercel,
      urls: deployedUrls.map(({ domain, vercelUrlEnv, url }) => ({
        domain,
        vercelUrlEnv,
        url,
      })),
    },
    null,
    2
  )
);
