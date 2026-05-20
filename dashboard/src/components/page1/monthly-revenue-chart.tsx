"use client"

import React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { MonthlyData } from "@/lib/data"

import { formatCurrency } from "@/lib/data"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MonthlyRevenueChartProps {
  data: MonthlyData[]
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

export const MonthlyRevenueChart = React.memo(function MonthlyRevenueChart({
  data,
}: MonthlyRevenueChartProps) {
  const chartData = data.map((d) => ({
    month: MONTH_LABELS[d.year_month] || d.year_month,
    revenue: d.revenue,
    transactions: d.transactions,
  }))

  const hasData = data.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue — 2015</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            No data for selected filters
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v as number)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "revenue" && typeof value === "number")
                      return [formatCurrency(value), "Revenue"]
                    return [value, "Transactions"]
                  }}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
