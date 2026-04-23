import { betterFetch } from "@better-fetch/fetch";
import { NextResponse, type NextRequest } from "next/server";

type FlowStateResponse = {
  hasSession: boolean;
  isReady: boolean;
  nextPath: string;
};

function getAuthFlowBaseUrl(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:3000";
  }

  return request.nextUrl.origin;
}

export default async function authProxy(request: NextRequest) {
  const { data: flow } = await betterFetch<FlowStateResponse>(
    "/api/auth/flow-state",
    {
      baseURL: getAuthFlowBaseUrl(request),
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  );

  if (!flow?.hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!flow.isReady) {
    if (flow.nextPath && new URL(request.url).pathname !== flow.nextPath) {
      return NextResponse.redirect(new URL(flow.nextPath, request.url));
    }
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
