"use client";

import type React from "react";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const currentTheme = resolvedTheme === "dark" ? "dark" : "light";

  const setTransitionOrigin = (button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    document.documentElement.style.setProperty("--theme-wave-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-wave-y", `${y}px`);
  };

  const changeThemeWithWave = (
    nextTheme: "light" | "dark",
    button: HTMLButtonElement
  ) => {
    if (currentTheme === nextTheme) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => {
        finished: Promise<void>;
      };
    };

    setTransitionOrigin(button);

    if (!transitionDocument.startViewTransition || prefersReducedMotion) {
      setTheme(nextTheme);
      return;
    }

    document.documentElement.classList.add("theme-transition");

    const transition = transitionDocument.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("theme-transition");
    });
  };

  const handleThemeChange = (event: React.MouseEvent<HTMLButtonElement>) => {
    changeThemeWithWave(
      currentTheme === "dark" ? "light" : "dark",
      event.currentTarget
    );
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = currentTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-8 rounded-full"
      onClick={handleThemeChange}
    >
      <Sun
        className={`absolute h-4 w-4 transition-all duration-300 ${isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"}`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all duration-300 ${isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
