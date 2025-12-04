"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { authClient, signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
    InputOTPSeparator,
} from "@/components/ui/input-otp"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { Mail, ArrowLeft, RefreshCw } from "lucide-react"
import Image from "next/image"

export default function VerifyPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get("email") || ""
    
    const [otp, setOtp] = useState("")
    const [isVerifying, setIsVerifying] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [countdown, setCountdown] = useState(0)

    useEffect(() => {
        if (!email) {
            router.push("/signup")
        }
    }, [email, router])

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    const handleVerify = async () => {
        if (otp.length !== 6) {
            toast.error("Please enter the complete code")
            return
        }

        setIsVerifying(true)

        try {
            const result = await authClient.emailOtp.verifyEmail({
                email,
                otp,
            })

            if (result.error) {
                if (result.error.code === "TOO_MANY_ATTEMPTS") {
                    toast.error("Too many attempts", {
                        description: "Please request a new code",
                    })
                } else {
                    toast.error("Invalid code", {
                        description: "Please check the code and try again",
                    })
                }
                setIsVerifying(false)
                return
            }

            toast.success("Email verified!")

            // Get stored credentials and sign in
            const pendingAuth = sessionStorage.getItem("pending_auth")
            if (pendingAuth) {
                const { email: storedEmail, password } = JSON.parse(pendingAuth)
                
                // Clear stored credentials immediately
                sessionStorage.removeItem("pending_auth")
                
                // Sign in to create session
                const signInResult = await signIn.email({
                    email: storedEmail,
                    password,
                })

                if (signInResult.error) {
                    console.error("Sign in error:", signInResult.error)
                    toast.error("Failed to sign in automatically")
                    router.push("/login")
                    return
                }

                router.push("/onboarding")
            } else {
                // No stored credentials, redirect to login
                router.push("/login")
            }
        } catch (error) {
            console.error("Verification error:", error)
            toast.error("An error occurred")
            setIsVerifying(false)
        }
    }

    const handleResend = async () => {
        if (countdown > 0) return

        setIsResending(true)

        try {
            const { error } = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: "email-verification",
            })

            if (error) {
                toast.error("Unable to send the code")
                setIsResending(false)
                return
            }

            toast.success("Code resent!", {
                description: "Check your inbox",
            })
            setCountdown(60)
            setOtp("")
        } catch (error) {
            console.error("Resend error:", error)
            toast.error("An error occurred")
        } finally {
            setIsResending(false)
        }
    }

    const handleOtpComplete = (value: string) => {
        setOtp(value)
        if (value.length === 6) {
            // Auto-verify when complete
            setTimeout(() => {
                const verifyBtn = document.getElementById("verify-btn")
                verifyBtn?.click()
            }, 300)
        }
    }

    if (!email) {
        return null
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <Toaster position="top-center" richColors />
            
            <div className="flex w-full max-w-md flex-col gap-6">
                <a href="/" className="flex items-center gap-2 self-center font-medium">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-black">
                        <Image
                            src="/dark-logo.png"
                            alt="ReachDem Logo"
                            width={32}
                            height={32}
                            className="rounded-sm"
                        />
                    </div>
                    ReachDem
                </a>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-8"
                >
                    <button
                        onClick={() => router.push("/signup")}
                        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-semibold mb-2">Verify your email</h1>
                        <p className="text-muted-foreground text-sm">
                            We sent a 6-digit code to
                        </p>
                        <p className="font-medium text-foreground">{email}</p>
                    </div>

                    <div className="flex justify-center mb-8">
                        <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={handleOtpComplete}
                            disabled={isVerifying}
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <Button
                        id="verify-btn"
                        onClick={handleVerify}
                        disabled={otp.length !== 6 || isVerifying}
                        className="w-full h-11 rounded-full bg-[#0a0a0a] hover:bg-[#1a1a1a]"
                    >
                        {isVerifying ? "Verifying..." : "Verify"}
                    </Button>

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Didn&apos;t receive the code?{" "}
                        <button
                            onClick={handleResend}
                            disabled={isResending || countdown > 0}
                            className="font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                        >
                            {countdown > 0
                                ? `Resend in ${countdown}s`
                                : isResending
                                    ? "Sending..."
                                    : "Resend"}
                        </button>
                    </div>
                </motion.div>

                <p className="text-center text-xs text-muted-foreground">
                    Code expires in 5 minutes
                </p>
            </div>
        </div>
    )
}
