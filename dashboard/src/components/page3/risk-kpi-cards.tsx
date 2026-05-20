import React from "react"

import { formatCurrency } from "@/lib/data"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RiskKPICardsProps {
  atRiskCount: number
  revenueAtRisk: number
  avgMarginAtRisk: number
  totalSKUs: number
}

export const RiskKPICards = React.memo(function RiskKPICards({
  atRiskCount,
  revenueAtRisk,
  avgMarginAtRisk,
  totalSKUs,
}: RiskKPICardsProps) {
  const riskPct =
    totalSKUs > 0 ? ((atRiskCount / totalSKUs) * 100).toFixed(1) : "0"

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            At-Risk SKUs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {atRiskCount.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {riskPct}% of {totalSKUs.toLocaleString("id-ID")} total SKUs
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Revenue at Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(revenueAtRisk)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            From at-risk SKUs only
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Margin (At-Risk)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {avgMarginAtRisk.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">Below threshold</p>
        </CardContent>
      </Card>
    </div>
  )
})
