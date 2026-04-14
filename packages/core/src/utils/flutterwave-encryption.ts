import { randomBytes, webcrypto } from "crypto";

function getSubtleCrypto(): SubtleCrypto {
  const cryptoSubtle = globalThis.crypto?.subtle || webcrypto?.subtle;

  if (!cryptoSubtle) {
    throw new Error("Crypto API is not available in this environment.");
  }

  return cryptoSubtle;
}

function normalizeKey(rawKey: string): string {
  return rawKey.trim().replace(/^["']|["']$/g, "");
}

export function createFlutterwaveNonce(): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(12);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function encryptFlutterwaveField(
  value: string,
  nonce: string
): Promise<string> {
  if (nonce.length !== 12) {
    throw new Error("Flutterwave nonce must be exactly 12 characters long.");
  }

  const rawKey = process.env.FLUTTERWAVE_PUB_ENCKEY_V4?.trim();

  if (!rawKey) {
    throw new Error(
      "Missing FLUTTERWAVE_PUB_ENCKEY_V4. Flutterwave card encryption cannot proceed."
    );
  }

  const subtle = getSubtleCrypto();
  const keyBytes = Buffer.from(normalizeKey(rawKey), "base64");
  const key = await subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = new TextEncoder().encode(nonce);
  const encrypted = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value)
  );

  return Buffer.from(encrypted).toString("base64");
}
