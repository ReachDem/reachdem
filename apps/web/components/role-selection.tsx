"use client"

import { motion } from "framer-motion"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { OnboardingData } from "./onboarding-flow"
import { Rocket, TrendingUp, Package, Briefcase, BarChart3, GraduationCap, Code, Megaphone } from "lucide-react"

const ROLES = [
  { id: "founder", label: "Founder", icon: Rocket },
  { id: "marketing", label: "Marketing Expert", icon: TrendingUp },
  { id: "product", label: "Product Manager", icon: Package },
  { id: "business", label: "Business Owner", icon: Briefcase },
  { id: "data", label: "Data Analyst", icon: BarChart3 },
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "developer", label: "Developer", icon: Code },
  { id: "communication", label: "Communication", icon: Megaphone },
]

interface RoleSelectionProps {
  data: OnboardingData
  updateData: (data: Partial<OnboardingData>) => void
  onNext: () => void
}

export function RoleSelection({ data, updateData, onNext }: RoleSelectionProps) {
  const toggleRole = (roleId: string) => {
    const currentRoles = data.roles
    if (currentRoles.includes(roleId)) {
      updateData({ roles: currentRoles.filter((r) => r !== roleId) })
    } else if (currentRoles.length < 2) {
      const newRoles = [...currentRoles, roleId]
      updateData({ roles: newRoles })
      toast.success(`Role "${ROLES.find((r) => r.id === roleId)?.label}" selected`, {
        description: newRoles.length === 2 ? "Maximum reached" : "You can select 1 more role",
      })
    } else {
      toast.error("Maximum 2 roles", {
        description: "Deselect a role to choose another one",
      })
    }
  }

  const handleContinue = () => {
    if (data.roles.length === 0) {
      toast.error("Select at least one role")
      return
    }
    toast.success("Profile configured!", {
      description: `Roles: ${data.roles.map((r) => ROLES.find((role) => role.id === r)?.label).join(", ")}`,
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
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          <span className="text-[#9ca3af]">Shaped by your choices,</span>
          <br />
          Driven by your vision
        </h1>
        <p className="text-muted-foreground mt-4">Which role best describes you?</p>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((role) => {
            const isSelected = data.roles.includes(role.id)
            const Icon = role.icon
            return (
              <button
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium transition-all duration-200",
                  isSelected
                    ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                    : "bg-background text-foreground border-border hover:border-[#9ca3af]",
                )}
              >
                <Icon className="w-3 h-3" />
                {role.label}
              </button>
            )
          })}
        </div>

        <Button
          onClick={handleContinue}
          disabled={data.roles.length === 0}
          className="w-full h-10 rounded-full bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white font-medium text-sm mt-6"
        >
          Continue
        </Button>
      </div>
    </motion.div>
  )
}
