import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, emailOTP } from "better-auth/plugins";
import { prisma } from "@reachdem/database";
import { ac, owner, admin, member } from "./permissions";
import { render } from "@react-email/render";
import { VerificationEmail } from "@reachdem/transactional/emails/verification";
import { WelcomeEmail } from "@reachdem/transactional/emails/welcome";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { ActivityLogger } from "@reachdem/core";

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

function getWelcomeDisplayName(user: { name?: string | null; email: string }) {
  const trimmedName = user.name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const emailLocalPart = user.email.split("@")[0]?.trim();

  return emailLocalPart || "there";
}

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
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation/${data.id}`;

        await ActivityLogger.log({
          organizationId: data.organization.id,
          actorType: "user",
          actorId: data.inviter.user.id,
          category: "auth",
          action: "send_success",
          status: "success",
          meta: {
            inviteEmail: data.email,
            inviteLink,
            role: data.role,
            action: "invitation_email",
          },
        }).catch(() => {});
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }, request) {
        const fallbackOrg = await prisma.organization.findFirst();
        const fallbackOrgId = fallbackOrg?.id || "fallback";

        await ActivityLogger.log({
          organizationId: fallbackOrgId,
          actorType: "system",
          category: "auth",
          action: "send_attempt",
          status: "pending",
          meta: { email, type, action: "sending_otp" },
        }).catch(() => {});

        const html = await render(VerificationEmail({ otp, name: "User" }));

        try {
          await transporter.sendMail({
            from: `ReachDem <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Verify your email address",
            html,
          });
          await ActivityLogger.log({
            organizationId: fallbackOrgId,
            actorType: "system",
            category: "auth",
            action: "send_success",
            status: "success",
            meta: { email, type, action: "sent_otp_success" },
          }).catch(() => {});
        } catch (err) {
          await ActivityLogger.log({
            organizationId: fallbackOrgId,
            actorType: "system",
            category: "auth",
            action: "send_failed",
            status: "failed",
            meta: {
              email,
              type,
              error: err instanceof Error ? err.message : "Unknown error",
            },
          }).catch(() => {});
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
    user: {
      create: {
        after: async (user) => {
          const fallbackOrg = await prisma.organization.findFirst();
          const fallbackOrgId = fallbackOrg?.id || "fallback";

          await ActivityLogger.log({
            organizationId: fallbackOrgId,
            actorType: "system",
            actorId: user.id,
            category: "auth",
            action: "send_attempt",
            status: "pending",
            meta: { email: user.email, action: "welcome_email_sending" },
          }).catch(() => {});

          try {
            const html = await render(
              WelcomeEmail({ name: getWelcomeDisplayName(user) })
            );
            await transporter.sendMail({
              from: `"Belrick from ReachDem" <${process.env.SMTP_USER}>`,
              replyTo: "contact@reachdem.cc",
              to: user.email,
              subject: "Welcome to ReachDem",
              html,
            });
            await ActivityLogger.log({
              organizationId: fallbackOrgId,
              actorType: "system",
              actorId: user.id,
              category: "auth",
              action: "send_success",
              status: "success",
              meta: { email: user.email, action: "welcome_email_sent" },
            }).catch(() => {});
          } catch (err) {
            await ActivityLogger.log({
              organizationId: fallbackOrgId,
              actorType: "system",
              actorId: user.id,
              category: "auth",
              action: "send_failed",
              status: "failed",
              meta: {
                email: user.email,
                error: err instanceof Error ? err.message : "Unknown error",
                action: "welcome_email_failed",
              },
            }).catch(() => {});
          }

          // Admin notification for new signup
          try {
            await transporter.sendMail({
              from: `"ReachDem App" <${process.env.SMTP_USER}>`,
              to: "contact@reachdem.cc",
              subject: `🎉 Un nouveau client vient de s'inscrire !`,
              text: `Un nouvel utilisateur vient de s'inscrire :\n\nNom: ${user.name || "Non spécifié"}\nEmail: ${user.email}\nID: ${user.id}\n\nYAY!`,
            });
          } catch (err) {
            console.error(
              "[Hooks] Failed to send admin notification email:",
              err
            );
          }
        },
      },
    },
  },
});

export type Auth = typeof auth;
