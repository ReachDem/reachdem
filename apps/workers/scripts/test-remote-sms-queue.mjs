import {
  createSmsExecutionJob,
  getWorkerBaseUrl,
  postJson,
} from "./utils.mjs";

const baseUrl = getWorkerBaseUrl();
const job = createSmsExecutionJob();
const response = await postJson(`${baseUrl}/queue/sms`, job);

console.log("[Remote SMS Queue] Enqueued job", job);
console.log("[Remote SMS Queue] Response", response);

