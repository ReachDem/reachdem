/**
 * Founder auth — JWT-based, locked to FOUNDER_DASHBOARD_EMAILS allowlist.
 * No public signup. Cookie HTTPOnly, SameSite=Strict.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// ── Constants ──────────────────────────────────────────────────────────────

const COOKIE_NAME = "founder_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

function getAllowedEmails(): Set<string> {
  const raw = process.env.FOUNDER_DASHBOARD_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.FOUNDER_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "FOUNDER_JWT_SECRET must be set and at least 32 chars long."
    );
  }
  return new TextEncoder().encode(secret);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface FounderSession {
  email: string;
  issuedAt: number;
  expiresAt: number;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function isEmailAllowed(email: string): boolean {
  return getAllowedEmails().has(email.toLowerCase());
}

export async function createSessionToken(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email, issuedAt: now })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + COOKIE_MAX_AGE)
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<FounderSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.email !== "string") return null;
    return {
      email: payload.email,
      issuedAt: payload.iat ?? 0,
      expiresAt: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<FounderSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

export function clearSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 0,
    path: "/",
  };
}
