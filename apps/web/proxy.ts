import { betterFetch } from "@better-fetch/fetch";
import { NextResponse, type NextRequest } from "next/server";

type FlowStateResponse = {
  hasSession: boolean;
  isReady: boolean;
  nextPath: string;
};

export default async function authProxy(request: NextRequest) {
  const { data: flow } = await betterFetch<FlowStateResponse>(
    "/api/auth/flow-state",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  );

  if (!flow?.hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!flow.isReady) {
    return NextResponse.redirect(new URL("/continue-setup", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/campaigns/:path*",
    "/contacts/:path*",
    "/settings/:path*",
  ],
};
