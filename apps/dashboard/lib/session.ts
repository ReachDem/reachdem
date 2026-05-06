import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  email?: string;
  isLoggedIn?: boolean;
}

const SESSION_OPTIONS: SessionOptions = {
  cookieName: "rd_admin_session",
  password: process.env.DASHBOARD_SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export const ALLOWED_EMAILS = [
  "latioms@gmail.com",
  "ronaldkamgaing4@gmail.com",
];

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}
