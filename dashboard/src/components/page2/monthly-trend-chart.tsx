"use client"

import React from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { MonthlyTrend } from "@/lib/data"

import { formatCurrency } from "@/lib/data"

interface MonthlyTrendChartProps {
  data: MonthlyTrend[]
}

const MONTH_LABELS: Record<string, string> = {
  "2015-01": "Jan",
  "2015-02": "Feb",
  "2015-03": "Mar",
  "2015-04": "Apr",
  "2015-05": "May",
  "2015-06": "Jun",
  "2015-07": "Jul",
  "2015-08": "Aug",
  "2015-09": "Sep",
  "2015-10": "Oct",
  "2015-11": "Nov",
  "2015-12": "Dec",
}

export const MonthlyTrendChart = React.memo(function MonthlyTrendChart({
  data,
}: MonthlyTrendChartProps) {
  const months = [...new Set(data.map((d) => d.year_month))].sort()

  const chartData = months.map((month) => {
    const generic = data.find(
      (d) => d.year_month === month && d.product_type === "Generic"
    )
    const branded = data.find(
      (d) => d.year_month === month && d.product_type === "Branded"
    )
    return {
      month: MONTH_LABELS[month] || month,
      Generic: generic?.revenue || 0,
      Branded: branded?.revenue || 0,
    }
  })

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value) || 0), "Revenue"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="Generic"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="Branded"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
})
