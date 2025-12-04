"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"

interface OnboardingGuardProps {
  children: React.ReactNode
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [canShowOnboarding, setCanShowOnboarding] = useState(false)

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (isPending) return

      // If not authenticated, redirect to login
      if (!session) {
        router.push("/login")
        return
      }

      try {
        // Check onboarding status from server
        const response = await fetch("/api/onboarding")
        const data = await response.json()

        if (response.ok && data.onboardingCompleted) {
          // Already completed onboarding, redirect to dashboard
          router.push("/dashboard")
          return
        }

        // User needs to complete onboarding
        setCanShowOnboarding(true)
      } catch (error) {
        console.error("Error checking onboarding status:", error)
        // On error, allow showing onboarding
        setCanShowOnboarding(true)
      } finally {
        setIsChecking(false)
      }
    }

    checkOnboardingStatus()
  }, [session, isPending, router])

  if (isPending || isChecking) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!canShowOnboarding) {
    return null
  }

  return <>{children}</>
}
