"use client";

import { useTipsEngine } from "./tips-engine";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface TipsCardProps {
  tipId: string;
  title: string;
  description: string;
  targetRef?: React.RefObject<HTMLElement | null>;
  position?: "top" | "bottom" | "left" | "right";
}

export function TipsCard({
  tipId,
  title,
  description,
  targetRef,
  position = "top",
}: TipsCardProps) {
  const { activeTip, dismissTip } = useTipsEngine();
  const isActive = activeTip === tipId;

  if (!isActive) return null;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card ring-primary/20 absolute z-50 w-64 rounded-xl border p-4 shadow-xl ring-1 backdrop-blur-sm"
          // In a real app we'd use floating-ui here attached to targetRef, but for now it's absolute
          style={{
            ...(position === "top"
              ? {
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginBottom: "8px",
                }
              : {}),
            ...(position === "bottom"
              ? {
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: "8px",
                }
              : {}),
            ...(position === "right"
              ? {
                  left: "100%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  marginLeft: "8px",
                }
              : {}),
            ...(position === "left"
              ? {
                  right: "100%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  marginRight: "8px",
                }
              : {}),
          }}
        >
          <div className="mb-2 flex items-start justify-between">
            <h4 className="text-sm font-semibold">{title}</h4>
            <button
              onClick={dismissTip}
              className="text-muted-foreground hover:bg-muted rounded-full p-1 transition-colors"
            >
              <X className="size-3" />
            </button>
          </div>
          <p className="text-muted-foreground mb-3 text-xs">{description}</p>
          <Button size="sm" className="h-7 w-full text-xs" onClick={dismissTip}>
            Got it
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
