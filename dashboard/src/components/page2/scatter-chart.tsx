"use client"

import React from "react"
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { SKUScatter } from "@/lib/data"

import { formatCurrency } from "@/lib/data"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ScatterChartProps {
  data: SKUScatter[]
}

export const SKUQuadrantChart = React.memo(function SKUQuadrantChart({
  data,
}: ScatterChartProps) {
  const validData = data.filter(
    (d) => d.avg_margin_pct !== null && d.revenue > 0
  )

  const MAX_POINTS = 500
  const needsSampling = validData.length > MAX_POINTS

  const displayData = needsSampling
    ? (() => {
        const sortedByRevenue = [...validData].sort(
          (a, b) => b.revenue - a.revenue
        )
        const topSKUs = sortedByRevenue.slice(0, 200)
        const remaining = sortedByRevenue.slice(200)
        const step = Math.ceil(remaining.length / (MAX_POINTS - 200))
        const sampled = remaining.filter((_, i) => i % step === 0)
        return [...topSKUs, ...sampled]
      })()
    : validData

  const chartData = displayData.map((d) => ({
    x: d.revenue,
    y: d.avg_margin_pct,
    z: d.total_qty,
    name: d.kd_obat,
    type: d.product_type,
  }))

  const medianRevenue =
    [...chartData].sort((a, b) => a.x - b.x)[Math.floor(chartData.length / 2)]
      ?.x || 0
  const medianMargin =
    [...chartData].sort((a, b) => (a.y || 0) - (b.y || 0))[
      Math.floor(chartData.length / 2)
    ]?.y || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          SKU Performance: Revenue vs Margin
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Revenue"
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 11 }}
                label={{ value: "Revenue", position: "bottom", offset: 0 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Margin %"
                unit="%"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Margin %",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload
                  return p ? `${p.name} (${p.type})` : ""
                }}
              />
              <ReferenceLine
                x={medianRevenue}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              <ReferenceLine
                y={medianMargin}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              <Scatter data={chartData} fill="#3b82f6" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-slate-400 rounded-sm" />
            <span>Median lines</span>
          </div>
          {needsSampling && (
            <div className="flex items-center gap-1">
              <span>
                Showing {chartData.length} of {validData.length} SKUs (sampled)
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 text-amber-600">
            <span>
              Full-year data — month filter applies to trend chart only
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
