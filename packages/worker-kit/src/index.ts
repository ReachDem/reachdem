import { z } from "zod";
import {
  parseWorkerEnvironment,
  type WorkerDomain,
  type WorkerEnvironment,
} from "@reachdem/jobs";

export interface WorkerQueue<T> {
  send(message: T): Promise<void>;
  sendBatch?(messages: Array<{ body: T }>): Promise<void>;
}

export interface QueueMessage<T> {
  body: T;
  attempts?: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

export interface QueueBatch<T = unknown> {
  queue: string;
  messages: Array<QueueMessage<T>>;
}

export interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

export class WorkerConfigurationError extends Error {
  constructor(
    public readonly scope: string,
    public readonly variableName: string,
    message: string
  ) {
    super(`[Env:${scope}] ${variableName}: ${message}`);
    this.name = "WorkerConfigurationError";
  }
}

export class WorkerAuthenticationError extends Error {
  constructor(message = "Invalid worker internal secret") {
    super(message);
    this.name = "WorkerAuthenticationError";
  }
}

export class WorkerRequestError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "WorkerRequestError";
  }
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface WorkerLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export function createWorkerLogger(domain: WorkerDomain): WorkerLogger {
  const write = (level: LogLevel, message: string, meta = {}) => {
    const payload = {
      level,
      domain,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    if (level === "error") {
      console.error(payload);
    } else if (level === "warn") {
      console.warn(payload);
    } else {
      console.log(payload);
    }
  };

  return {
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  };
}

export function serializeWorkerError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { name: "NonError", message: String(error) };
}

function isMissing(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

export function requireStringEnv(
  env: Record<string, unknown>,
  key: string,
  scope: string
): string {
  const value = env[key];
  if (typeof value !== "string" || isMissing(value)) {
    throw new WorkerConfigurationError(
      scope,
      key,
      "required variable is missing or empty"
    );
  }

  return value.trim();
}

export function optionalStringEnv(
  env: Record<string, unknown>,
  key: string
): string | undefined {
  const value = env[key];
  return typeof value === "string" && !isMissing(value)
    ? value.trim()
    : undefined;
}

export function requireUrlEnv(
  env: Record<string, unknown>,
  key: string,
  scope: string
): string {
  const value = requireStringEnv(env, key, scope);
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new WorkerConfigurationError(scope, key, "must be a valid URL");
  }
}

export function requireWorkerEnvironment(
  env: Record<string, unknown>,
  scope: string
): WorkerEnvironment {
  const raw =
    optionalStringEnv(env, "WORKER_ENV") ??
    optionalStringEnv(env, "ENVIRONMENT");
  const parsed = parseWorkerEnvironment(raw);
  if (!raw) {
    throw new WorkerConfigurationError(
      scope,
      "WORKER_ENV",
      "required variable is missing or empty"
    );
  }

  return parsed;
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index++) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

export function assertInternalRequest(
  request: Request,
  env: Record<string, unknown>,
  scope: string
): void {
  const expected = requireStringEnv(
    env,
    "REACHDEM_WORKER_INTERNAL_SECRET",
    scope
  );
  const actual = request.headers.get("x-internal-secret") ?? "";
  if (!actual || !constantTimeEqual(actual, expected)) {
    throw new WorkerAuthenticationError();
  }
}

export async function parseJsonWithSchema<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new WorkerRequestError("Invalid JSON body", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new WorkerRequestError(parsed.error.message, 400);
  }

  return parsed.data;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof WorkerAuthenticationError) {
    return Response.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof WorkerRequestError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof WorkerConfigurationError) {
    return Response.json(
      {
        error: error.message,
        scope: error.scope,
        variable: error.variableName,
      },
      { status: 500 }
    );
  }

  return Response.json({ error: "Worker request failed" }, { status: 500 });
}

export async function processQueueBatch<T>(input: {
  batch: QueueBatch<T>;
  logger: WorkerLogger;
  handler: (message: QueueMessage<T>) => Promise<unknown>;
}): Promise<void> {
  input.logger.info("queue.batch.started", {
    queue: input.batch.queue,
    size: input.batch.messages.length,
  });

  for (const message of input.batch.messages) {
    try {
      const outcome = await input.handler(message);
      message.ack();
      input.logger.info("queue.message.acked", {
        queue: input.batch.queue,
        attempts: message.attempts ?? null,
        outcome,
      });
    } catch (error) {
      input.logger.error("queue.message.retry", {
        queue: input.batch.queue,
        attempts: message.attempts ?? null,
        error: serializeWorkerError(error),
      });
      message.retry();
    }
  }
}

export async function sendQueueBatch<T>(
  queue: WorkerQueue<T>,
  jobs: T[]
): Promise<void> {
  if (jobs.length === 0) return;

  if (queue.sendBatch) {
    await queue.sendBatch(jobs.map((body) => ({ body })));
    return;
  }

  for (const job of jobs) {
    await queue.send(job);
  }
}
