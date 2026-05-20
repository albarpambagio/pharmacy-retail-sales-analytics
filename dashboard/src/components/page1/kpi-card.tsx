"use client"

import { Minus, TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

interface KPICardProps {
  title: string
  value: string
  subtitle: string
  delta?: number
  deltaLabel?: string
}

export function KPICard({
  title,
  value,
  subtitle,
  delta,
  deltaLabel,
}: KPICardProps) {
  const deltaIcon =
    delta == null ? (
      <Minus className="h-4 w-4 text-muted-foreground" />
    ) : delta > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  const deltaColor =
    delta == null
      ? "text-muted-foreground"
      : delta > 0
        ? "text-green-600"
        : "text-red-600"

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        <div className="mt-2 flex items-center gap-1">
          {deltaIcon}
          {delta != null && (
            <span className={`text-sm font-medium ${deltaColor}`}>
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}% {deltaLabel || "vs prev month"}
            </span>
          )}
          {delta == null && (
            <span className="text-sm text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
