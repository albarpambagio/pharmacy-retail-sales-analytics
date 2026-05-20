"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

const items = [
  {
    title: "Generic vs Branded",
    content:
      "Generic medicines (AI- prefix) account for 70.3% of total revenue, while branded (R- prefix) makes up 29.7%. Margins are nearly identical at ~35% for both types.",
  },
  {
    title: "Quadrant Analysis",
    content:
      "The scatter plot shows SKUs by revenue (x-axis) vs margin % (y-axis). Top-right = high revenue + high margin (ideal). Bottom-left = low revenue + low margin (review). The median lines divide the chart into four quadrants.",
  },
  {
    title: "Top 20 Table",
    content:
      "Sorted by revenue descending by default. Search filters by SKU code. Export CSV downloads the filtered view. Click column headers to sort by that column.",
  },
  {
    title: "Monthly Trend",
    content:
      "Line chart shows only 5 months with data (January, March, April, August, September 2015). Dashed line = Branded, Solid = Generic. Gap months have no recorded transactions.",
  },
  {
    title: "Data Source",
    content:
      "Product type classification is derived from SKU prefix (AI-* = Generic, R-* = Branded). Price tier derived from HJ (selling price) ranges: Low < 100K, Mid 100K-500K, High 500K-1M, Premium > 1M.",
  },
]

export function InterpretationGuide() {
  const [open, setOpen] = useState(false)

  const toggle = () => setOpen((prev) => !prev)

  return (
    <Card>
      <div
        className="cursor-pointer select-none p-6 pb-0"
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggle()
          }
        }}
      >
        <div className="flex items-center gap-2 text-base font-medium">
          <Info className="h-4 w-4 text-muted-foreground" />
          About This Dashboard
          <span className="ml-auto text-muted-foreground">
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </div>
      </div>
      {open && (
        <CardContent className="space-y-4 pt-0">
          {items.map((item) => (
            <div key={item.title}>
              <h4 className="mb-1 text-sm font-semibold">{item.title}</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.content}
              </p>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
