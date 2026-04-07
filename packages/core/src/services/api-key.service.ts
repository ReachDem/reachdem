import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@reachdem/database";
import type { ApiRequestContext } from "../types/public-api";
import { PublicApiError } from "../errors/public-api.errors";

const API_KEY_PATTERN =
  /^rd_(live|test)_([A-Za-z0-9]{8})_([A-Za-z0-9_-]{32,})$/;

function getHashSecret(): string {
  const secret = process.env.API_KEY_HASH_SECRET;
  if (!secret) {
    throw new PublicApiError(
      "internal_error",
      "API key hashing is not configured",
      500
    );
  }
  return secret;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export class ApiKeyService {
  static hashKey(apiKey: string): string {
    return createHmac("sha256", getHashSecret()).update(apiKey).digest("hex");
  }

  static parse(apiKey: string): {
    environment: "live" | "test";
    keyPrefix: string;
  } {
    const match = API_KEY_PATTERN.exec(apiKey);
    if (!match) {
      throw new PublicApiError("invalid_api_key", "Invalid API key", 401);
    }

    return {
      environment: match[1] as "live" | "test",
      keyPrefix: `rd_${match[1]}_${match[2]}`,
    };
  }

  static generate(environment: "live" | "test" = "live"): {
    apiKey: string;
    keyPrefix: string;
    keyHash: string;
  } {
    const publicPrefix = randomBytes(4).toString("hex");
    const secret = randomBytes(32).toString("base64url");
    const apiKey = `rd_${environment}_${publicPrefix}_${secret}`;

    return {
      apiKey,
      keyPrefix: `rd_${environment}_${publicPrefix}`,
      keyHash: this.hashKey(apiKey),
    };
  }

  static async authenticate(
    authorizationHeader: string | null,
    requiredScopes: string[] = []
  ): Promise<ApiRequestContext> {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new PublicApiError("unauthorized", "Missing bearer API key", 401);
    }

    const apiKey = authorizationHeader.slice("Bearer ".length).trim();
    const { keyPrefix } = this.parse(apiKey);
    const incomingHash = this.hashKey(apiKey);

    const storedKey = await prisma.apiKey.findUnique({
      where: { keyPrefix },
      select: {
        id: true,
        organizationId: true,
        keyPrefix: true,
        keyHash: true,
        scopes: true,
        revokedAt: true,
      },
    });

    if (!storedKey || !safeEqual(storedKey.keyHash, incomingHash)) {
      throw new PublicApiError("invalid_api_key", "Invalid API key", 401);
    }

    if (storedKey.revokedAt) {
      throw new PublicApiError(
        "api_key_revoked",
        "API key has been revoked",
        401
      );
    }

    const missingScopes = requiredScopes.filter(
      (scope) => !storedKey.scopes.includes(scope)
    );
    if (missingScopes.length > 0) {
      throw new PublicApiError(
        "insufficient_scope",
        "Insufficient API key scope",
        403,
        {
          missingScopes,
        }
      );
    }

    await prisma.apiKey.update({
      where: { id: storedKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      requestId: "",
      organizationId: storedKey.organizationId,
      apiKeyId: storedKey.id,
      keyPrefix: storedKey.keyPrefix,
      scopes: storedKey.scopes,
    };
  }
}
