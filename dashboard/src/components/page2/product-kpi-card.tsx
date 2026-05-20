"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ProductKPICardProps {
  title: string
  value: string
  subtitle?: string
  percentage?: number
}

export function ProductKPICard({
  title,
  value,
  subtitle,
  percentage,
}: ProductKPICardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {percentage !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {percentage.toFixed(1)}% of total
          </p>
        )}
      </CardContent>
    </Card>
  )
}
