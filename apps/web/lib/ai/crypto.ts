import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const AI_SETTINGS_ENCRYPTION_ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const rawSecret =
    process.env.AI_SETTINGS_ENCRYPTION_SECRET ??
    process.env.API_KEY_ENCRYPTION_SECRET ??
    process.env.BETTER_AUTH_SECRET;

  if (!rawSecret) {
    throw new Error(
      "Missing AI settings encryption secret. Set AI_SETTINGS_ENCRYPTION_SECRET, API_KEY_ENCRYPTION_SECRET, or BETTER_AUTH_SECRET."
    );
  }

  return createHash("sha256").update(rawSecret).digest();
}

export function encryptAISecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    AI_SETTINGS_ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
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

export function decryptAISecret(payload: string): string {
  const [ivRaw, authTagRaw, encryptedRaw] = payload.split(".");

  if (!ivRaw || !authTagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted AI secret payload.");
  }

  const decipher = createDecipheriv(
    AI_SETTINGS_ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivRaw, "base64url")
  );

  decipher.setAuthTag(Buffer.from(authTagRaw, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
