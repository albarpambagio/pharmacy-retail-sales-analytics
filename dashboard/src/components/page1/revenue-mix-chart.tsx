"use client"

import React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { MonthlyData } from "@/lib/data"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RevenueMixChartProps {
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

export const RevenueMixChart = React.memo(function RevenueMixChart({
  data,
}: RevenueMixChartProps) {
  const chartData = data.map((d) => {
    const total = (d.revenue_outpatient ?? 0) + (d.revenue_inpatient ?? 0)
    return {
      month: MONTH_LABELS[d.year_month] || d.year_month,
      outpatient: total > 0 ? ((d.revenue_outpatient ?? 0) / total) * 100 : 0,
      inpatient: total > 0 ? ((d.revenue_inpatient ?? 0) / total) * 100 : 0,
    }
  })

  const hasData = data.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Mix — Outpatient vs Inpatient</CardTitle>
        <p className="text-sm text-muted-foreground">
          % of monthly revenue by transaction type
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[240px] items-center justify-center text-muted-foreground">
            No data for selected filters
          </div>
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value) => [
                    typeof value === "number" ? `${value.toFixed(1)}%` : value,
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="outpatient"
                  name="Outpatient (RJ)"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="inpatient"
                  name="Inpatient (RI)"
                  stackId="1"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
