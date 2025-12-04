import { OnboardingFlow } from "@/components/onboarding-flow"
import { OnboardingGuard } from "./onboarding-guard"

export default function OnboardingPage() {
  return (
    <OnboardingGuard>
      <main className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
        <OnboardingFlow />
      </main>
    </OnboardingGuard>
  )
}
