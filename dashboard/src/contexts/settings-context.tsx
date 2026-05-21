"use client"

import { createContext, useCallback, useEffect, useState } from "react"
import { useCookie } from "react-use"

import type { ModeType } from "@/types"
import type { ReactNode } from "react"

export const defaultSettings = {
  mode: "system" as ModeType,
}

export const SettingsContext = createContext<
  | {
      settings: typeof defaultSettings
      updateSettings: (newSettings: typeof defaultSettings) => void
      resetSettings: () => void
    }
  | undefined
>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [storedSettings, setStoredSettings, deleteStoredSettings] =
    useCookie("settings")
  const [settings, setSettings] = useState<typeof defaultSettings | null>(null)

  useEffect(() => {
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings))
    } else {
      setSettings({ ...defaultSettings })
    }
  }, [storedSettings])

  const updateSettings = useCallback(
    (newSettings: typeof defaultSettings) => {
      setStoredSettings(JSON.stringify(newSettings))
      setSettings(newSettings)
    },
    [setStoredSettings]
  )

  const resetSettings = useCallback(() => {
    deleteStoredSettings()
    setSettings(defaultSettings)
  }, [deleteStoredSettings])

  if (!settings) {
    return null
  }

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
