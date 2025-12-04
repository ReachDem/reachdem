import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { emailOTP } from "better-auth/plugins"
import { prisma } from "@/lib/prisma"
import { sendOTPEmail } from "@/lib/resend"

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL as string,
    trustedOrigins: [process.env.BETTER_AUTH_URL as string],
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        requireEmailVerification: true,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        },
    },
    advanced: {
        generateId: () => crypto.randomUUID(),
        cookiePrefix: "better-auth",
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    plugins: [
        emailOTP({
            otpLength: 6,
            expiresIn: 300, // 5 minutes
            sendVerificationOnSignUp: true,
            async sendVerificationOTP({ email, otp, type }) {
                // Don't await to avoid timing attacks
                sendOTPEmail({ to: email, otp, type }).catch((err) => {
                    console.error("Failed to send OTP:", err);
                });
            },
        }),
    ],
})
