import { createHash } from "crypto";
import { Prisma, prisma } from "@reachdem/database";
import { PublicApiError } from "../errors/public-api.errors";

export type ApiIdempotencyInput = {
  organizationId: string;
  apiKeyId: string;
  idempotencyKey: string | null;
  method: string;
  path: string;
  rawBody: string;
  ttlSeconds?: number;
};

export type ApiIdempotencyBeginResult =
  | { kind: "started"; recordId: string }
  | { kind: "replay"; responseStatus: number; responseBody: unknown };

function ttlFromEnv(): number {
  const value = Number(process.env.API_IDEMPOTENCY_TTL_SECONDS ?? "86400");
  return Number.isFinite(value) && value > 0 ? value : 86400;
}

export class ApiIdempotencyService {
  static computeRequestHash(input: {
    method: string;
    path: string;
    rawBody: string;
  }): string {
    return createHash("sha256")
      .update(input.method.toUpperCase())
      .update("\n")
      .update(input.path)
      .update("\n")
      .update(input.rawBody)
      .digest("hex");
  }

  static async begin(
    input: ApiIdempotencyInput
  ): Promise<ApiIdempotencyBeginResult> {
    if (!input.idempotencyKey) {
      throw new PublicApiError(
        "missing_idempotency_key",
        "Idempotency-Key header is required",
        400
      );
    }

    const requestHash = this.computeRequestHash(input);
    const method = input.method.toUpperCase();
    const expiresAt = new Date(
      Date.now() + (input.ttlSeconds ?? ttlFromEnv()) * 1000
    );

    try {
      const record = await prisma.apiIdempotencyRecord.create({
        data: {
          organizationId: input.organizationId,
          apiKeyId: input.apiKeyId,
          idempotencyKey: input.idempotencyKey,
          method,
          path: input.path,
          requestHash,
          expiresAt,
        },
      });

      return { kind: "started", recordId: record.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.apiIdempotencyRecord.findUnique({
          where: {
            organizationId_apiKeyId_method_path_idempotencyKey: {
              organizationId: input.organizationId,
              apiKeyId: input.apiKeyId,
              method,
              path: input.path,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });

        if (!existing) {
          throw new PublicApiError(
            "idempotency_processing",
            "Idempotency record is unavailable",
            409
          );
        }

        if (existing.expiresAt <= new Date()) {
          await prisma.apiIdempotencyRecord.delete({
            where: { id: existing.id },
          });
          return this.begin(input);
        }

        if (existing.requestHash !== requestHash) {
          throw new PublicApiError(
            "idempotency_conflict",
            "Idempotency-Key was already used with a different request",
            409
          );
        }

        if (
          existing.status === "completed" &&
          existing.responseStatus != null
        ) {
          return {
            kind: "replay",
            responseStatus: existing.responseStatus,
            responseBody: existing.responseBody,
          };
        }

        throw new PublicApiError(
          "idempotency_processing",
          "Request with this Idempotency-Key is still processing",
          409
        );
      }

      throw error;
    }
  }

  static async complete(
    recordId: string,
    responseStatus: number,
    responseBody: unknown
  ): Promise<void> {
    await prisma.apiIdempotencyRecord.update({
      where: { id: recordId },
      data: {
        status: "completed",
        responseStatus,
        responseBody: responseBody as any,
      },
    });
  }

  static async fail(recordId: string): Promise<void> {
    await prisma.apiIdempotencyRecord.update({
      where: { id: recordId },
      data: { status: "failed" },
    });
  }
}
