"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { OnboardingData } from "./onboarding-flow"

interface StepVisualProps {
  step: number
  data: OnboardingData
}

export function StepVisual({ step, data }: StepVisualProps) {
  return (
    <div className="h-full flex flex-col justify-between p-8 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 1 && <RoleVisual key="role-visual" data={data} />}
        {step === 2 && <WorkspaceVisual key="workspace-visual" />}
        {step === 3 && <CreateVisual key="create-visual" data={data} />}
        {step === 4 && <KybVisual key="kyb-visual" data={data} />}
      </AnimatePresence>
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  founder: "Founder",
  marketing: "Marketing Expert",
  product: "Product Manager",
  business: "Business Owner",
  data: "Data Analyst",
  student: "Student",
  developer: "Developer",
  communication: "Communication",
}

function PlaceholderImage({ label }: { label: string }) {
  return (
    <div className="w-full h-full rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
      <span className="text-neutral-500 text-sm">{label}</span>
    </div>
  )
}

function RoleVisual({ data }: { data: OnboardingData }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col justify-between relative z-10"
    >
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">A unique experience.</h2>
        <p className="text-neutral-400 text-sm leading-relaxed">
          We adapt your experience based on your role to offer you the most relevant tools.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center py-6">
        <div className="relative w-full max-w-[280px] aspect-square">
          <PlaceholderImage label="Role Visual" />
        </div>
      </div>

      <div className="space-y-2">
        {data.roles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.roles.map((roleId) => (
              <span
                key={roleId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm"
              >
                {ROLE_LABELS[roleId]}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">Select your roles...</p>
        )}
      </div>
    </motion.div>
  )
}

function WorkspaceVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col justify-between relative z-10"
    >
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">Collaborative space</h2>
        <p className="text-neutral-400 text-sm leading-relaxed">
          A workspace centralizes your campaigns, team, and analytics in one place.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center py-6">
        <div className="relative w-full max-w-[300px] aspect-[4/3]">
          <PlaceholderImage label="Workspace Visual" />
        </div>
      </div>

      <div className="flex items-center gap-2 text-neutral-400 text-sm">
        <div className="w-2 h-2 rounded-full bg-cyan-500" />
        <span>SMS, Email, WhatsApp & more</span>
      </div>
    </motion.div>
  )
}

function CreateVisual({ data }: { data: OnboardingData }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col justify-between relative z-10"
    >
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">Brand identity</h2>
        <p className="text-neutral-400 text-sm leading-relaxed">
          Your project code will be the sender of your SMS and the header of your emails.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center py-6">
        <div className="relative w-full max-w-[280px] aspect-square">
          <PlaceholderImage label="Messaging Visual" />
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-500 text-xs uppercase tracking-wider">Preview</span>
          <span className="text-cyan-400 text-xs">Live</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 font-bold">{(data.projectName || "P").charAt(0)}</span>
          </div>
          <div>
            <p className="text-white text-sm font-medium">{data.workspaceName || "Workspace name"}</p>
            <p className="text-cyan-400 text-xs font-mono">{data.projectName || "PROJECT_CODE"}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function KybVisual({ data }: { data: OnboardingData }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col justify-between relative z-10"
    >
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">Almost done!</h2>
        <p className="text-neutral-400 text-sm leading-relaxed">
          This information helps us better understand your needs and improve our suggestions.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center py-6">
        <div className="relative w-full max-w-[280px] aspect-square">
          <PlaceholderImage label="Launch Visual" />
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{(data.workspaceName || "W").charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">{data.workspaceName || "Workspace"}</p>
            <p className="text-cyan-400 text-xs font-mono">{data.projectName || "CODE"}</p>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-cyan-400 text-xs">Ready</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
