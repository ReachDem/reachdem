import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { prisma } from "@reachdem/database";

type ParsedApiKey = {
  id: string;
  secret: string;
};

type ApiKeyRecord = {
  id: string;
  organizationId: string;
  createdBy: string;
  encryptedSecret: string | null;
  redacted: string;
  title: string;
  type: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export const API_KEY_PREFIX = "rdm";
const API_KEY_ENCRYPTION_ALGORITHM = "aes-256-gcm";
const DEFAULT_API_KEY_TITLE = "Default API key";
const DEFAULT_API_KEY_TYPE = "default";

function hashSecret(secret: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${secret}`).digest("hex");
}

function getApiKeyEncryptionKey() {
  const rawSecret =
    process.env.API_KEY_ENCRYPTION_SECRET ?? process.env.BETTER_AUTH_SECRET;

  if (!rawSecret) {
    throw new Error(
      "Missing API key encryption secret. Set API_KEY_ENCRYPTION_SECRET or BETTER_AUTH_SECRET."
    );
  }

  return createHash("sha256").update(rawSecret).digest();
}

function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    API_KEY_ENCRYPTION_ALGORITHM,
    getApiKeyEncryptionKey(),
    iv
  );
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function decryptSecret(payload: string): string {
  const [ivRaw, authTagRaw, encryptedRaw] = payload.split(".");

  if (!ivRaw || !authTagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted API key payload.");
  }

  const decipher = createDecipheriv(
    API_KEY_ENCRYPTION_ALGORITHM,
    getApiKeyEncryptionKey(),
    Buffer.from(ivRaw, "base64url")
  );

  decipher.setAuthTag(Buffer.from(authTagRaw, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function generateApiKeyId() {
  return randomBytes(5).toString("hex");
}

function generateApiKeySecret() {
  return randomBytes(24).toString("base64url");
}

export function createApiKeyToken(id: string, secret: string) {
  return `${API_KEY_PREFIX}_${id}_${secret}`;
}

function toHydratedApiKey(apiKey: ApiKeyRecord) {
  if (!apiKey.encryptedSecret) {
    return null;
  }

  const secret = decryptSecret(apiKey.encryptedSecret);

  return {
    id: apiKey.id,
    organizationId: apiKey.organizationId,
    createdBy: apiKey.createdBy,
    token: createApiKeyToken(apiKey.id, secret),
    redacted: apiKey.redacted,
    title: apiKey.title,
    type: apiKey.type,
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt,
  };
}

async function findActiveDefaultApiKey(organizationId: string) {
  return prisma.apiKey.findFirst({
    where: {
      organizationId,
      type: DEFAULT_API_KEY_TYPE,
      revokedAt: null,
      deletedAt: null,
      encryptedSecret: {
        not: null,
      },
    },
    select: {
      id: true,
      organizationId: true,
      createdBy: true,
      encryptedSecret: true,
      redacted: true,
      title: true,
      type: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
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

export async function createWorkspaceApiKey(input: {
  organizationId: string;
  createdBy: string;
  title?: string;
  type?: string;
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = generateApiKeyId();
    const secret = generateApiKeySecret();
    const salt = randomBytes(16).toString("base64url");
    const token = hashSecret(secret, salt);
    const redacted = `${API_KEY_PREFIX}_${id}_...${secret.slice(-4)}`;

    try {
      const apiKey = await prisma.apiKey.create({
        data: {
          id,
          organizationId: input.organizationId,
          token,
          salt,
          encryptedSecret: encryptSecret(secret),
          redacted,
          title: input.title ?? DEFAULT_API_KEY_TITLE,
          type: input.type ?? DEFAULT_API_KEY_TYPE,
          createdBy: input.createdBy,
        },
        select: {
          id: true,
          organizationId: true,
          createdBy: true,
          encryptedSecret: true,
          redacted: true,
          title: true,
          type: true,
          createdAt: true,
          lastUsedAt: true,
        },
      });

      return toHydratedApiKey(apiKey)!;
    } catch (error: any) {
      if (error?.code === "P2002") {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a unique API key ID.");
}

export async function ensureDefaultApiKeyForOrganization(input: {
  organizationId: string;
  createdBy: string;
}) {
  const existing = await findActiveDefaultApiKey(input.organizationId);

  if (existing) {
    return toHydratedApiKey(existing)!;
  }

  return createWorkspaceApiKey({
    organizationId: input.organizationId,
    createdBy: input.createdBy,
    title: DEFAULT_API_KEY_TITLE,
    type: DEFAULT_API_KEY_TYPE,
  });
}

export async function rotateDefaultApiKeyForOrganization(input: {
  organizationId: string;
  revokedBy: string;
}) {
  await prisma.apiKey.updateMany({
    where: {
      organizationId: input.organizationId,
      type: DEFAULT_API_KEY_TYPE,
      revokedAt: null,
      deletedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedBy: input.revokedBy,
    },
  });

  return createWorkspaceApiKey({
    organizationId: input.organizationId,
    createdBy: input.revokedBy,
    title: DEFAULT_API_KEY_TITLE,
    type: DEFAULT_API_KEY_TYPE,
  });
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
