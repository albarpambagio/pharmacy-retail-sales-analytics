"use client"

import React, { useMemo } from "react"
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

import type { MarginSKU } from "@/lib/data"

import { formatCurrency } from "@/lib/data"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MarginScatterChartProps {
  skus: MarginSKU[]
  threshold: number
}

export const MarginScatterChart = React.memo(function MarginScatterChart({
  skus,
  threshold,
}: MarginScatterChartProps) {
  const { atRisk, safe, sampled } = useMemo(() => {
    const validData = skus.filter((s) => s.avg_margin_pct !== null)
    const atRisk: Array<{
      kd_obat: string
      product_type: string
      qty: number
      revenue: number
      margin: number
    }> = []
    const safe: Array<{
      kd_obat: string
      product_type: string
      qty: number
      revenue: number
      margin: number
    }> = []

    const MAX_POINTS = 500
    const needsSampling = validData.length > MAX_POINTS
    let sampled = false

    const sourceData = needsSampling
      ? (() => {
          sampled = true
          const topSKUs = validData.slice(0, 200)
          const remaining = validData.slice(200)
          const step = Math.ceil(remaining.length / (MAX_POINTS - 200))
          return [...topSKUs, ...remaining.filter((_, i) => i % step === 0)]
        })()
      : validData

    for (const s of sourceData) {
      const point = {
        kd_obat: s.kd_obat,
        product_type: s.product_type,
        qty: s.total_qty,
        revenue: s.revenue,
        margin: s.avg_margin_pct,
      }
      if (s.avg_margin_pct < threshold) {
        atRisk.push(point)
      } else {
        safe.push(point)
      }
    }

    return { atRisk, safe, sampled }
  }, [skus, threshold])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Volume vs Margin % by SKU</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="qty"
                name="Quantity"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Total Quantity",
                  position: "bottom",
                  offset: 10,
                }}
              />
              <YAxis
                type="number"
                dataKey="margin"
                name="Margin %"
                unit="%"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Margin %",
                  angle: -90,
                  position: "insideLeft",
                  offset: -5,
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload
                  return p ? `${p.kd_obat} (${p.product_type})` : ""
                }}
                formatter={(value, name) => {
                  const v = Number(value) || 0
                  if (name === "revenue") return [formatCurrency(v), "Revenue"]
                  if (name === "margin") return [`${v.toFixed(1)}%`, "Margin"]
                  if (name === "qty")
                    return [v.toLocaleString("id-ID"), "Quantity"]
                  return [v, name]
                }}
              />
              <ReferenceLine
                y={threshold}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Threshold: ${threshold}%`,
                  position: "right",
                  fill: "#ef4444",
                  fontSize: 11,
                }}
              />
              <Scatter data={safe} fill="#94a3b8" fillOpacity={0.4} />
              <Scatter data={atRisk} fill="#ef4444" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: "#ef4444" }}
            />
            <span>Below threshold</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-slate-400" />
            <span>Above threshold</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-6 h-0.5 bg-red-500"
              style={{ borderTop: "2px dashed #ef4444" }}
            />
            <span>Threshold line</span>
          </div>
          {sampled && (
            <div className="flex items-center gap-1">
              <span>
                Showing {atRisk.length + safe.length} of{" "}
                {skus.filter((s) => s.avg_margin_pct !== null).length} SKUs
                (sampled)
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
