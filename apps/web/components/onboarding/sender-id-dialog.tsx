"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SenderIdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SenderIdDialog({
  open,
  onOpenChange,
  onSuccess,
}: SenderIdDialogProps) {
  const [step, setStep] = useState(1);
  const [senderId, setSenderId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextStep = () => setStep((p) => p + 1);
  const prevStep = () => setStep((p) => Math.max(1, p - 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Fake API call for the demo
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    nextStep();
    if (onSuccess) onSuccess();
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation completes
    setTimeout(() => {
      setStep(1);
      setSenderId("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md overflow-hidden border-none p-0 lg:max-w-xl">
        {/* Header Progress Tracker */}
        <div className="bg-muted/30 relative flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-foreground font-semibold tracking-tight">
            Configure Channel
          </h2>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${s <= step ? "bg-primary" : "bg-muted-foreground/20"}`}
              />
            ))}
          </div>
        </div>

        <div className="relative min-h-[350px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex h-full flex-col p-6"
              >
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-semibold">
                    What is a Sender ID?
                  </h3>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    A Sender ID is the alphanumeric name that appears on your
                    customers' phones when they receive your SMS. It replaces
                    the standard phone number with your brand name, increasing
                    trust and open rates.
                  </p>

                  <ul className="mb-6 space-y-3">
                    <li className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
                      <span className="text-foreground">
                        Between 3 and 11 characters long
                      </span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
                      <span className="text-foreground">
                        Only letters, numbers, and spaces allowed
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-auto flex justify-end border-t pt-4">
                  <Button onClick={nextStep} className="gap-2">
                    Continue <ArrowRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex h-full flex-col p-6"
              >
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-semibold">
                    Choose your Sender ID
                  </h3>
                  <p className="text-muted-foreground mb-6 text-sm">
                    Enter the name you want your customers to see. This requires
                    approval from telecom operators to prevent spoofing.
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="senderId">Sender ID Name</Label>
                      <Input
                        id="senderId"
                        placeholder="e.g. REACHDEM"
                        value={senderId}
                        onChange={(e) =>
                          setSenderId(e.target.value.toUpperCase().slice(0, 11))
                        }
                        className="h-12 text-lg font-medium tracking-wider uppercase"
                      />
                      <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                        <span>Alphanumeric only</span>
                        <span
                          className={
                            senderId.length > 11 ? "text-destructive" : ""
                          }
                        >
                          {senderId.length} / 11
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex justify-between border-t pt-4">
                  <Button variant="ghost" onClick={prevStep}>
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!senderId || senderId.length < 3 || isSubmitting}
                    className="min-w-[120px]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Submit for Approval"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex h-full flex-col items-center justify-center p-8 text-center"
              >
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="mb-3 text-2xl font-bold tracking-tight">
                  Request Submitted!
                </h3>
                <p className="text-muted-foreground mx-auto mb-8 max-w-[280px] text-sm">
                  Your Sender ID{" "}
                  <strong className="text-foreground">{senderId}</strong> is
                  currently pending review. You will receive an email once it's
                  approved by operators.
                </p>
                <Button
                  onClick={handleClose}
                  className="w-full px-8 sm:w-auto"
                  size="lg"
                >
                  Back to Dashboard
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
