import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextResponse, type NextRequest } from "next/server";

export default async function authProxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const { data: session } = await betterFetch<Session>(
        "/api/auth/get-session",
        {
            baseURL: request.nextUrl.origin,
            headers: {
                cookie: request.headers.get("cookie") || "",
            },
        },
    );

    // If not authenticated, redirect to login
    if (!session) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // For onboarding page, let the client-side guard handle the logic
    // (checking if onboarding is already completed)
    
    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard", "/onboarding"],
};
