import { Lato } from "next/font/google"

import { cn } from "@/lib/utils"

import "./globals.css"

import { Providers } from "@/providers"

import type { Metadata } from "next"
import type { ReactNode } from "react"

import { DataProvider } from "@/contexts/data-context"

export const metadata: Metadata = {
  title: {
    template: "%s | Pharmacy Retail Analytics",
    default: "Pharmacy Retail Analytics",
  },
  description:
    "Hospital pharmacy sales analytics dashboard — 2015 operational data",
  metadataBase: new URL(process.env.BASE_URL ?? "http://localhost:3000"),
}

const latoFont = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-lato",
})

export default function RootLayout(props: { children: ReactNode }) {
  const { children } = props

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground antialiased overscroll-none",
          latoFont.variable
        )}
      >
        <Providers>
          <DataProvider>{children}</DataProvider>
        </Providers>
      </body>
    </html>
  )
}
