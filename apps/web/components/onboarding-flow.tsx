"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { RoleSelection } from "./role-selection"
import { WorkspaceChoice } from "./workspace-choice"
import { CreateWorkspace } from "./create-workspace"
import { KybForm } from "./kyb-form"
import { WelcomeAnimation } from "./welcome-animation"
import { StepIndicator } from "./step-indicator"
import { StepVisual } from "./step-visual"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"

export type OnboardingData = {
  roles: string[]
  workspaceName: string
  projectName: string
  action: "create" | "join" | null
  kyb: {
    companyName: string
    industry: string
    teamSize: string
    website: string
  }
}

const TOTAL_STEPS = 4

export function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    roles: [],
    workspaceName: "",
    projectName: "",
    action: null,
    kyb: {
      companyName: "",
      industry: "",
      teamSize: "",
      website: "",
    },
  })

  const updateData = (partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }))
  }

  const nextStep = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS + 1))
  const prevStep = () => setStep((s) => Math.max(s - 1, 1))

  const handleComplete = async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roles: data.roles,
          workspaceName: data.workspaceName,
          projectCode: data.projectName,
          action: data.action || "create",
          kyb: data.kyb,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || "An error occurred")
        setIsSubmitting(false)
        return
      }

      // Save to localStorage as backup indicator
      localStorage.setItem("onboarding_completed", "true")
      
      // Show welcome animation
      setShowWelcome(true)
      
      // Redirect to dashboard after animation
      setTimeout(() => {
        router.push("/dashboard")
      }, 3000)
    } catch (error) {
      console.error("Onboarding error:", error)
      toast.error("Failed to complete onboarding")
      setIsSubmitting(false)
    }
  }

  if (showWelcome) {
    return <WelcomeAnimation />
  }

  return (
    <div className="w-full max-w-5xl px-4">
      <Toaster position="top-center" richColors />

      <motion.div
        className="bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="grid md:grid-cols-5 min-h-[600px]">
          {/* Left side - Interactive */}
          <div className="md:col-span-2 p-6 md:p-8 flex flex-col border border-gray-200 rounded-2xl m-2">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                {step === 1 && <RoleSelection key="role" data={data} updateData={updateData} onNext={nextStep} />}
                {step === 2 && (
                  <WorkspaceChoice
                    key="workspace-choice"
                    data={data}
                    updateData={updateData}
                    onNext={nextStep}
                    onBack={prevStep}
                  />
                )}
                {step === 3 && (
                  <CreateWorkspace
                    key="create-workspace"
                    data={data}
                    updateData={updateData}
                    onNext={nextStep}
                    onBack={prevStep}
                  />
                )}
                {step === 4 && (
                  <KybForm
                    key="kyb"
                    data={data}
                    updateData={updateData}
                    onComplete={handleComplete}
                    onBack={prevStep}
                    isSubmitting={isSubmitting}
                  />
                )}
              </AnimatePresence>
            </div>

            {step < 4 && (
              <div className="pt-3">
                <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
              </div>
            )}
          </div>

          {/* Right side - Visual/Static */}
          <div className="hidden md:block md:col-span-3 bg-[#0a0a0a] rounded-2xl m-2 overflow-hidden">
            <StepVisual step={step} data={data} />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
