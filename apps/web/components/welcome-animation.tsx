"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function WelcomeAnimation() {
  const [phase, setPhase] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 800)
    const timer2 = setTimeout(() => setPhase(2), 1600)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const handleGoToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase >= 0 ? 1 : 0,
            y: phase >= 0 ? 0 : 20,
          }}
          transition={{ duration: 0.5 }}
          className="text-[#9ca3af] text-lg"
        >
          Welcome to
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase >= 1 ? 1 : 0,
            y: phase >= 1 ? 0 : 20,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-5xl md:text-6xl font-bold text-white"
        >
          ReachDem
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="pt-8"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGoToDashboard}
            className="px-8 py-3 text-[#0a0a0a] font-medium bg-[rgba(255,255,255,1)] rounded-none cursor-pointer"
          >
            Accéder au dashboard
          </motion.button>
        </motion.div>
      </div>

      {/* Animated background particles */}
      {phase >= 1 && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: [0, (i % 2 ? 1 : -1) * (50 + i * 20)],
                y: [0, -30 - i * 10],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                ease: "easeOut",
              }}
              className="absolute w-2 h-2 rounded-full bg-cyan-400"
              style={{
                left: `calc(50% + ${(i - 2.5) * 40}px)`,
                top: "50%",
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
