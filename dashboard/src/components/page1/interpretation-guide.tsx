"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const items = [
  {
    title: "Data Coverage",
    content:
      "Only 5 months have transaction data (January, March, April, August, September 2015). February, May–July, and October–December have no recorded transactions in the source dataset. Charts and totals reflect only these months.",
  },
  {
    title: "Conditional Formatting",
    content:
      "Red margin values flag months where the average margin is below the overall revenue-weighted average for all displayed months. Bold revenue rows indicate the month with the highest total revenue.",
  },
  {
    title: "KPI Delta Calculations",
    content:
      "The up/down arrows on KPI cards compare the last available month against the previous available month, skipping months with no data. For example, September vs August, not September vs a contiguous calendar month.",
  },
  {
    title: "Revenue Mix (Outpatient vs Inpatient)",
    content:
      "The stacked area chart shows the percentage split between Outpatient (RJ — Rawat Jalan) and Inpatient (RI — Rawat Inap) revenue each month. January shows 100% inpatient because no outpatient transactions were recorded that month.",
  },
  {
    title: "Weighted Average Margin",
    content:
      "The 'Avg Margin %' in the KPI card and table total row is revenue-weighted, not a simple average. Months with higher revenue contribute more to the overall figure.",
  },
  {
    title: "Filter Behavior",
    content:
      "The Month filter shows only the selected month. Transaction Type recalculates revenue totals for only Outpatient or Inpatient channels. Product Type is available but currently applies only to data exported for deeper product-level analysis.",
  },
  {
    title: "Terminology",
    content:
      "RJ = Rawat Jalan (Outpatient). RI = Rawat Inap (Inpatient). HNA = Harga Netto Apotek (net pharmacy price, excluding VAT). HJ = Harga Jual (selling price). Gross margin = (HJ − HNA) / HJ × 100%.",
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
