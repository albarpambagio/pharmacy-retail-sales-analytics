import type { ReactNode } from "react"

import { SettingsProvider } from "@/contexts/settings-context"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ModeProvider } from "./mode-provider"
import { ThemeProvider } from "./theme-provider"

export function Providers({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <SettingsProvider>
      <ModeProvider>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </ModeProvider>
    </SettingsProvider>
  )
}
