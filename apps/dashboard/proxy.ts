import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken, isEmailAllowed } from "@/lib/founder-admin/auth";

const PUBLIC_PATHS = ["/login", "/favicon.ico", "/_next", "/api/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("founder_session")?.value;

  if (!token) {
    console.warn(`[founder-middleware] No session — redirecting: ${pathname}`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySessionToken(token);

  if (!session || !isEmailAllowed(session.email)) {
    console.warn(
      `[founder-middleware] Forbidden access by: ${session?.email ?? "unknown"} to ${pathname}`
    );
    return new NextResponse("403 Forbidden — founder access only", {
      status: 403,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const response = NextResponse.next();
  // Inject founder email as request header for server components
  response.headers.set("x-founder-email", session.email);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
