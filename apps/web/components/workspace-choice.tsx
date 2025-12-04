"use client"

import { motion } from "framer-motion"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import type { OnboardingData } from "./onboarding-flow"

interface WorkspaceChoiceProps {
  data: OnboardingData
  updateData: (data: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export function WorkspaceChoice({ updateData, onNext, onBack }: WorkspaceChoiceProps) {
  const handleCreate = () => {
    updateData({ action: "create" })
    toast.success("Creating a workspace", {
      description: "Configure your new workspace",
    })
    onNext()
  }

  const handleJoin = () => {
    updateData({ action: "join" })
    toast.info("Join a workspace", {
      description: "Contact the administrator to get an invitation",
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit text-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <div className="space-y-1.5 mb-6">
        <h1 className="text-xl font-semibold text-foreground">Your Workspace</h1>
        <p className="text-muted-foreground text-sm">A workspace brings together your team and messaging campaigns.</p>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            className="w-full py-3 px-6 rounded-full bg-[#0a0a0a] text-white font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
          >
            Create a workspace
          </motion.button>

          <button
            onClick={handleJoin}
            className="w-full flex items-center justify-center py-2 text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            Join an existing workspace
          </button>
        </div>

        <div />
      </div>
    </motion.div>
  )
}
