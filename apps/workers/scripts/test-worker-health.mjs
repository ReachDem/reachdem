import { getJson, getWorkerBaseUrl } from "./utils.mjs";

const baseUrl = getWorkerBaseUrl();

const health = await getJson(`${baseUrl}/health`);
const status = await getJson(`${baseUrl}/queue/status`);

console.log("[Remote Health] /health", health);
console.log("[Remote Health] /queue/status", status);

