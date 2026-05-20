"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const items = [
  {
    title: "Margin Threshold",
    content:
      "The slider sets the minimum acceptable gross margin percentage. SKUs with margins below this threshold are flagged as 'at-risk'. The default of 10% is a common retail pharmacy benchmark — below this level, the margin may not cover operational costs (storage, handling, dispensing).",
  },
  {
    title: "At-Risk SKU Definition",
    content:
      "An at-risk SKU is any product where the average gross margin percentage falls below the threshold. Gross margin = (Selling Price − Net Cost) / Net Cost × 100. Some SKUs show negative margins, meaning they are sold below cost — these require immediate pricing review.",
  },
  {
    title: "Scatter Plot",
    content:
      "Each dot represents one SKU. X-axis = total quantity sold, Y-axis = average margin %. Red dots are below the threshold, gray dots are above. The dashed red line shows the current threshold. High-volume SKUs with low margins (bottom-right) pose the greatest financial risk.",
  },
  {
    title: "Histogram",
    content:
      "Shows the distribution of all 2,232 SKU margins across 30 bins. Red bars = bins entirely below threshold, amber = bins crossing the threshold, gray = bins above. A right-skewed distribution indicates most SKUs have healthy margins.",
  },
  {
    title: "Gross Margin Formula",
    content:
      "Gross Margin % = ((HJ − HNA) / HNA) × 100, where HJ = Harga Jual (selling price) and HNA = Harga Netto Apotek (net pharmacist cost). When HNA = 0, margin is set to NULL to avoid division by zero.",
  },
  {
    title: "Risk Interpretation",
    content:
      "Only 23 SKUs (1% of total) fall below 10% margin, representing just 0.2% of total revenue — indicating low systemic risk. However, high-volume items with negative margins (e.g., R-1322, R-4605) should be prioritized for pricing review as they lose money on every sale.",
  },
]

export function InterpretationGuide() {
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Info className="h-4 w-4 text-muted-foreground" />
          About This Dashboard
          <span className="ml-auto text-muted-foreground">
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </CardTitle>
      </CardHeader>
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
