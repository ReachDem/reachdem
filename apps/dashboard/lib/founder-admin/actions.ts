"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearSessionCookieOptions,
  createSessionToken,
  isEmailAllowed,
  sessionCookieOptions,
} from "@/lib/founder-admin/auth";

// Static founder passwords held in env — simple for internal tool.
// Format: FOUNDER_PASSWORDS=email1@x.com:pass1,email2@x.com:pass2
function getPasswordMap(): Map<string, string> {
  const raw = process.env.FOUNDER_PASSWORDS ?? "";
  const map = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const [email, ...rest] = pair.trim().split(":");
    if (email && rest.length > 0) {
      map.set(email.toLowerCase(), rest.join(":"));
    }
  }
  return map;
}

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isEmailAllowed(email)) {
    console.warn(`[founder-auth] Forbidden login attempt: ${email}`);
    return { error: "Access denied. This dashboard is restricted." };
  }

  const passwords = getPasswordMap();
  const expected = passwords.get(email);

  if (!expected || expected !== password) {
    console.warn(`[founder-auth] Invalid credentials for: ${email}`);
    return { error: "Invalid email or password." };
  }

  const token = await createSessionToken(email);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(token));

  console.info(`[founder-auth] Login success: ${email}`);
  redirect("/overview");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(clearSessionCookieOptions());
  console.info("[founder-auth] Logout");
  redirect("/login");
}
