import {
  createEmailExecutionJob,
  getWorkerBaseUrl,
  postJson,
} from "./utils.mjs";

const baseUrl = getWorkerBaseUrl();
const job = createEmailExecutionJob();
const response = await postJson(`${baseUrl}/queue/email`, job);

console.log("[Remote Email Queue] Enqueued job", job);
console.log("[Remote Email Queue] Response", response);

