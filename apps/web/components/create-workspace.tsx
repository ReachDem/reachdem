"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Building2, Tag } from "lucide-react"
import type { OnboardingData } from "./onboarding-flow"

interface CreateWorkspaceProps {
  data: OnboardingData
  updateData: (data: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

function generateProjectName(workspaceName: string): string {
  return workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 15)
    .toUpperCase()
}

export function CreateWorkspace({ data, updateData, onNext, onBack }: CreateWorkspaceProps) {
  useEffect(() => {
    if (data.workspaceName && !data.projectName) {
      updateData({ projectName: generateProjectName(data.workspaceName) })
    }
  }, [])

  const handleWorkspaceChange = (value: string) => {
    updateData({
      workspaceName: value,
      projectName: generateProjectName(value),
    })
  }

  const handleContinue = () => {
    if (!data.workspaceName.trim()) {
      toast.error("Workspace name required")
      return
    }
    if (!data.projectName.trim()) {
      toast.error("Project code required")
      return
    }
    toast.success("Workspace configured!", {
      description: `${data.workspaceName} • Code: ${data.projectName}`,
    })
    onNext()
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
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-2 mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Create your Workspace</h1>
        <p className="text-muted-foreground">This information will be used to identify your communications.</p>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="workspace" className="text-foreground font-medium">
              Workspace Name
            </Label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="workspace"
                placeholder="E.g.: My Company"
                value={data.workspaceName}
                onChange={(e) => handleWorkspaceChange(e.target.value)}
                className="h-12 pl-12 rounded-xl border-border focus:border-foreground focus:ring-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project" className="text-foreground font-medium">
              Project Code
            </Label>
            <p className="text-xs text-muted-foreground">Used as SMS sender and email header</p>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="project"
                placeholder="PROJECT_CODE"
                value={data.projectName}
                onChange={(e) => updateData({ projectName: e.target.value.toUpperCase() })}
                className="h-12 pl-12 rounded-xl border-border focus:border-foreground focus:ring-foreground font-mono"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!data.workspaceName.trim()}
          className="w-full h-9 rounded-full bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white font-medium text-xs"
        >
          Continue
        </Button>
      </div>
    </motion.div>
  )
}
