"use client"

import type React from "react"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = (event: React.MouseEvent<HTMLButtonElement>) => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    // Calculate the maximum distance to any corner of the viewport
    const maxX = Math.max(x, window.innerWidth - x)
    const maxY = Math.max(y, window.innerHeight - y)
    const maxRadius = Math.sqrt(maxX * maxX + maxY * maxY)

    // Create the ripple overlay
    const ripple = document.createElement("div")
    ripple.style.cssText = `
      position: fixed;
      top: ${y}px;
      left: ${x}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 9999;
      background-color: ${newTheme === "dark" ? "oklch(0.145 0 0)" : "oklch(1 0 0)"};
    `
    document.body.appendChild(ripple)

    // Animate the ripple
    ripple.animate(
      [
        { width: "0px", height: "0px", opacity: 1 },
        {
          width: `${maxRadius * 2}px`,
          height: `${maxRadius * 2}px`,
          opacity: 1,
        },
      ],
      {
        duration: 600,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      },
    ).onfinish = () => {
      setTheme(newTheme)
      setTimeout(() => {
        ripple.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 200,
          easing: "ease-out",
          fill: "forwards",
        }).onfinish = () => {
          ripple.remove()
        }
      }, 50)
    }
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-full relative"
      onClick={handleThemeChange}
    >
      <Sun
        className={`h-4 w-4 absolute transition-all duration-300 ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`}
      />
      <Moon
        className={`h-4 w-4 absolute transition-all duration-300 ${isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
