import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, emailOTP } from "better-auth/plugins";
import { prisma } from "@reachdem/database";
import { ac, owner, admin, member } from "./permissions";
import { render } from "@react-email/render";
import { VerificationEmail } from "@reachdem/transactional/emails/verification";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASSWORD;
const smtpPort = parseInt(process.env.SMTP_PORT || "465");

if (!smtpHost || !smtpUser || !smtpPass || isNaN(smtpPort)) {
  // In a real app, you'd want to throw an error to fail fast during startup.
  console.error(
    "SMTP environment variables are not configured correctly. Please check SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_PORT."
  );
}

const smtpOptions: SMTPTransport.Options = {
  host: smtpHost!,
  port: smtpPort,
  secure: true,
  auth: {
    user: smtpUser!,
    pass: smtpPass!,
  },
  // Alibaba Cloud SMTP requires LOGIN auth mechanism
  authMethod: "LOGIN",
};
const transporter = nodemailer.createTransport(smtpOptions);

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
    ...(process.env.NODE_ENV === "production"
      ? {
          cookiePrefix: "reachdem",
          crossSubDomainCookies: {
            enabled: true,
            domain: process.env.AUTH_COOKIE_DOMAIN || ".reachdem.cc",
          },
          useSecureCookies: true,
        }
      : {}),
  },

  plugins: [
    organization({
      ac,
      roles: { owner, admin, member },
      allowUserToCreateOrganization: async (user: any) => {
        return user.emailVerified === true;
      },
      creatorRole: "owner",
      async sendInvitationEmail(data: any) {
        // TODO: Wire to your email provider (Resend / Alibaba DM)
        // For now, log the invitation link to console
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation/${data.id}`;
        console.log(`[Auth] Invitation email to ${data.email}:`, inviteLink);
        console.log(
          `  Invited by: ${data.inviter.user.name} (${data.inviter.user.email})`
        );
        console.log(`  Organization: ${data.organization.name}`);
        console.log(`  Role: ${data.role}`);
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }, request) {
        console.log(`[EmailOTP] Sending ${type} OTP`);

        const html = await render(VerificationEmail({ otp, name: "User" }));

        try {
          await transporter.sendMail({
            from: `ReachDem <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Verify your email address",
            html,
          });
          console.log(`[EmailOTP] Successfully sent OTP`);
        } catch (err) {
          console.error("[EmailOTP] Failed to send OTP email:", err);
        }
      },
    }),
  ],

  databaseHooks: {
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
                  activeOrganizationId: membership.organizationId,
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
