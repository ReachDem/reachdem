"use client"

import { motion } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Building, Globe, Users, Briefcase } from "lucide-react"
import type { OnboardingData } from "./onboarding-flow"

const INDUSTRIES = [
  "E-commerce",
  "SaaS / Tech",
  "Finance",
  "Healthcare",
  "Education",
  "Real Estate",
  "Restaurants",
  "Retail",
  "Other",
]

const TEAM_SIZES = ["Solo", "2-10", "11-50", "51-200", "200+"]

interface KybFormProps {
  data: OnboardingData
  updateData: (data: Partial<OnboardingData>) => void
  onComplete: () => void
  onBack: () => void
  isSubmitting?: boolean
}

export function KybForm({ data, updateData, onComplete, onBack, isSubmitting = false }: KybFormProps) {
  const updateKyb = (field: keyof OnboardingData["kyb"], value: string) => {
    updateData({
      kyb: { ...data.kyb, [field]: value },
    })
  }

  const handleComplete = () => {
    toast.success("Configuration complete!", {
      description: "Your workspace is ready to use",
    })
    onComplete()
  }

  const handleSkip = () => {
    toast.info("Form skipped", {
      description: "You can complete this information later",
    })
    onComplete()
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

      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Tell us about yourself</h1>
        <p className="text-muted-foreground">This information helps us personalize your experience.</p>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="company" className="text-foreground font-normal">
              Company Name
            </Label>
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="company"
                placeholder="Your company"
                value={data.kyb.companyName}
                onChange={(e) => updateKyb("companyName", e.target.value)}
                className="h-11 pl-12 rounded-xl border-border focus:border-foreground focus:ring-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Industry</Label>
            <Select value={data.kyb.industry} onValueChange={(v) => updateKyb("industry", v)}>
              <SelectTrigger className="h-11 rounded-xl border-border">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  <SelectValue placeholder="Select an industry" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Team Size</Label>
            <Select value={data.kyb.teamSize} onValueChange={(v) => updateKyb("teamSize", v)}>
              <SelectTrigger className="h-11 rounded-xl border-border">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <SelectValue placeholder="Number of people" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size} people
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website" className="text-foreground font-medium">
              Website <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="website"
                placeholder="https://your-website.com"
                value={data.kyb.website}
                onChange={(e) => updateKyb("website", e.target.value)}
                className="h-11 pl-12 rounded-xl border-border focus:border-foreground focus:ring-foreground"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-10">
          <Button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="w-full h-9 rounded-full bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white font-medium text-xs"
          >
            {isSubmitting ? "Creating workspace..." : "Complete setup"}
          </Button>
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Skip for now and start
          </button>
        </div>
      </div>
    </motion.div>
  )
}
