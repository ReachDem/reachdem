import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Email verification is disabled for development. 
    // IMPORTANT: Enable in production by setting to true and configuring an email provider
    // You can also use an environment variable: process.env.NODE_ENV === 'production'
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
  },
  socialProviders: {
    // Add OAuth providers as needed
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID as string,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    // },
    // github: {
    //   clientId: process.env.GITHUB_CLIENT_ID as string,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    // },
  },
  secret: process.env.BETTER_AUTH_SECRET as string,
  baseURL: process.env.BETTER_AUTH_URL as string,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL as string,
    // Add other trusted origins as needed
  ],
});
