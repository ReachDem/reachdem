import { createHash, timingSafeEqual } from "crypto";
import { prisma } from "@reachdem/database";

type ParsedApiKey = {
  id: string;
  secret: string;
};

function hashSecret(secret: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${secret}`).digest("hex");
}

function parseBearerApiKey(rawToken: string): ParsedApiKey | null {
  const token = rawToken.trim();

  if (!token) {
    return null;
  }

  const dotSeparatorIndex = token.indexOf(".");
  if (dotSeparatorIndex > 0 && dotSeparatorIndex < token.length - 1) {
    return {
      id: token.slice(0, dotSeparatorIndex),
      secret: token.slice(dotSeparatorIndex + 1),
    };
  }

  const parts = token.split("_");

  if (parts.length >= 4 && parts[0] === "rdm") {
    return {
      id: parts[2],
      secret: parts.slice(3).join("_"),
    };
  }

  if (parts.length >= 3 && parts[0] === "rdm") {
    return {
      id: parts[1],
      secret: parts.slice(2).join("_"),
    };
  }

  return null;
}

function safeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function authenticateApiKey(rawToken: string) {
  const parsed = parseBearerApiKey(rawToken);

  if (!parsed) {
    return null;
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: parsed.id,
      revokedAt: null,
      deletedAt: null,
    },
    select: {
      id: true,
      token: true,
      salt: true,
      createdBy: true,
      organizationId: true,
    },
  });

  if (!apiKey) {
    return null;
  }

  const candidateHash = hashSecret(parsed.secret, apiKey.salt);

  if (!safeEqualHex(candidateHash, apiKey.token)) {
    return null;
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
    },
  });

  return {
    apiKeyId: apiKey.id,
    organizationId: apiKey.organizationId,
    userId: apiKey.createdBy,
  };
}
