import { NextResponse } from "next/server";
import { getSession, ALLOWED_EMAILS } from "@/lib/session";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (
    !email ||
    !password ||
    !ALLOWED_EMAILS.includes(email.toLowerCase().trim())
  ) {
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  if (password !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.email = email.toLowerCase().trim();
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
