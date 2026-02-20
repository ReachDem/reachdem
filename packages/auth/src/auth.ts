import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { prisma } from "@reachdem/database";
import { ac, owner, admin, member } from "./permissions";

/**
 * Central Better Auth configuration shared by all apps (ReachDem + Links).
 *
 * Each Next.js app mounts this via its own /api/auth/[...all] route handler,
 * but they all share the same config, DB, cookies, and session state.
 */
export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL as string,

    trustedOrigins: [
        process.env.BETTER_AUTH_URL as string,
        process.env.NEXT_PUBLIC_APP_URL as string,
        process.env.NEXT_PUBLIC_LINKS_URL as string,
        "http://localhost:3000",
        "http://localhost:3001",
    ].filter(Boolean),

    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),

    emailAndPassword: {
        enabled: true,
    },

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },

    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day (refresh threshold)
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        },
    },

    advanced: {
        generateId: () => crypto.randomUUID(),
        cookiePrefix: "reachdem",
        crossSubDomainCookies: {
            enabled: process.env.NODE_ENV === "production" || !!process.env.AUTH_COOKIE_DOMAIN,
            domain: process.env.AUTH_COOKIE_DOMAIN || (process.env.NODE_ENV === "production" ? ".reachdem.cc" : undefined),
        },
        useSecureCookies: process.env.NODE_ENV === "production",
    },

    plugins: [
        organization({
            ac,
            roles: { owner, admin, member },
            allowUserToCreateOrganization: true,
            creatorRole: "owner",
            async sendInvitationEmail(data) {
                // TODO: Wire to your email provider (Resend / Alibaba DM)
                // For now, log the invitation link to console
                const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation/${data.id}`;
                console.log(
                    `[Auth] Invitation email to ${data.email}:`,
                    inviteLink,
                );
                console.log(
                    `  Invited by: ${data.inviter.user.name} (${data.inviter.user.email})`,
                );
                console.log(`  Organization: ${data.organization.name}`);
                console.log(`  Role: ${data.role}`);
            },
        }),
    ],

    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    // Auto-create a "Personal Workspace" for every new user
                    try {
                        const org = await prisma.organization.create({
                            data: {
                                id: crypto.randomUUID(),
                                name: `${user.name}'s Workspace`,
                                slug: `personal-${user.id.slice(0, 8)}`,
                                createdAt: new Date(),
                            },
                        });

                        await prisma.member.create({
                            data: {
                                id: crypto.randomUUID(),
                                organizationId: org.id,
                                userId: user.id,
                                role: "owner",
                                createdAt: new Date(),
                            },
                        });

                        console.log(
                            `[Auth] Created personal workspace "${org.name}" for user ${user.email}`,
                        );
                    } catch (error) {
                        console.error(
                            "[Auth] Failed to create personal workspace:",
                            error,
                        );
                    }
                },
            },
        },
        session: {
            create: {
                before: async (session) => {
                    // Auto-set active organization on login if none is set
                    if (!session.activeOrganizationId) {
                        const membership = await prisma.member.findFirst({
                            where: { userId: session.userId },
                            orderBy: { createdAt: "asc" },
                            select: { organizationId: true },
                        });

                        if (membership) {
                            return {
                                data: {
                                    ...session,
                                    activeOrganizationId:
                                        membership.organizationId,
                                },
                            };
                        }
                    }
                    return { data: session };
                },
            },
        },
    },
});

export type Auth = typeof auth;
