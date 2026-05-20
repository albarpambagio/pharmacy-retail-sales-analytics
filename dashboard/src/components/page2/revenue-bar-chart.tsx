"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { ProductTypeRevenue } from "@/lib/data"

import { formatCurrency } from "@/lib/data"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RevenueBarChartProps {
  data: ProductTypeRevenue[]
}

const COLORS = ["#3b82f6", "#f59e0b"]

export function RevenueBarChart({ data }: RevenueBarChartProps) {
  const chartData = data.map((item) => ({
    name: item.product_type,
    revenue: item.revenue,
    margin: item.avg_margin_pct,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue by Product Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [
                  formatCurrency(Number(value) || 0),
                  "Revenue",
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
