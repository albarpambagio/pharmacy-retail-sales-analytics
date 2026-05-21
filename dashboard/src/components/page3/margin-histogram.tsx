"use client"

import React, { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { MarginSKU } from "@/lib/data"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MarginHistogramProps {
  skus: MarginSKU[]
  threshold: number
}

export const MarginHistogram = React.memo(function MarginHistogram({
  skus,
  threshold,
}: MarginHistogramProps) {
  const chartData = useMemo(() => {
    const validMargins = skus
      .map((s) => s.avg_margin_pct)
      .filter((m): m is number => m !== null)

    if (validMargins.length === 0) return []

    const minM = Math.min(...validMargins)
    const maxM = Math.max(...validMargins)
    const binCount = 30
    const binWidth = (maxM - minM) / binCount || 1

    const bins: { bin_start: number; bin_end: number; count: number }[] = []
    for (let i = 0; i < binCount; i++) {
      const lo = minM + i * binWidth
      const hi = lo + binWidth
      const count = validMargins.filter(
        (m) => m >= lo && (i === binCount - 1 ? m <= hi : m < hi)
      ).length
      bins.push({ bin_start: lo, bin_end: hi, count })
    }

    return bins.map((bin) => {
      const isBelow = bin.bin_end < threshold
      const crossesThreshold =
        bin.bin_start < threshold && bin.bin_end >= threshold

      return {
        label: `${bin.bin_start.toFixed(1)}–${bin.bin_end.toFixed(1)}%`,
        count: bin.count,
        fill: isBelow ? "#ef4444" : crossesThreshold ? "#f59e0b" : "#94a3b8",
      }
    })
  }, [skus, threshold])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">SKU Margin Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, bottom: 40, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={Math.floor(chartData.length / 10)}
              />
              <YAxis
                dataKey="count"
                name="SKU Count"
                tick={{ fontSize: 11 }}
                label={{
                  value: "SKU Count",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
                formatter={(value: unknown) => [
                  Number(value).toLocaleString("id-ID"),
                  "SKUs",
                ]}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>Below threshold</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span>Crosses threshold</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-slate-400" />
            <span>Above threshold</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
