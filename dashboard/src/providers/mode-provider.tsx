"use client"

import { useEffect } from "react"

import type { ReactNode } from "react"

import { useSettings } from "@/hooks/use-settings"

export function ModeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()

  useEffect(() => {
    const rootElement = document.documentElement

    rootElement.classList.remove("light", "dark")

    if (settings.mode === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      rootElement.classList.add(isDark ? "dark" : "light")
    } else {
      rootElement.classList.add(settings.mode)
    }
  }, [settings.mode])

  return <>{children}</>
}
