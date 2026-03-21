import { getWorkerBaseUrl, requireEnv } from "./utils.mjs";

const baseUrl = getWorkerBaseUrl();
requireEnv("TEST_ORG_ID");

console.log("[Remote Env] OK");
console.log(`[Remote Env] Worker base URL: ${baseUrl}`);

