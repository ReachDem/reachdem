import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { ac, owner, admin, member } from "./permissions";

/**
 * Shared auth client for both ReachDem and Links apps.
 *
 * Each app must set NEXT_PUBLIC_APP_URL to the base URL of the app
 * that hosts the primary auth API (ReachDem by default).
 */
export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    plugins: [
        organizationClient({
            ac,
            roles: { owner, admin, member },
        }),
    ],
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
} = authClient;
