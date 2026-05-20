"use client"

import { useEffect, useMemo, useState } from "react"

import type { ProductsData } from "@/lib/data"

import { formatCurrency, getProductsData } from "@/lib/data"

import { InterpretationGuide } from "@/components/page2/interpretation-guide"
import { MonthlyTrendChart } from "@/components/page2/monthly-trend-chart"
import { ProductKPICard } from "@/components/page2/product-kpi-card"
import { RevenueBarChart } from "@/components/page2/revenue-bar-chart"
import { SKUQuadrantChart } from "@/components/page2/scatter-chart"
import { Top20Table } from "@/components/page2/top-20-table"

export default function ProductsPage() {
  const [data, setData] = useState<ProductsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProductsData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totals = useMemo(() => {
    if (!data) return { generic: 0, branded: 0, total: 0, skuCount: 0 }
    const generic =
      data.product_type_revenue.find((d) => d.product_type === "Generic")
        ?.revenue || 0
    const branded =
      data.product_type_revenue.find((d) => d.product_type === "Branded")
        ?.revenue || 0
    const total = generic + branded
    const skuCount = data.sku_scatter.length
    return { generic, branded, total, skuCount }
  }, [data])

  if (loading) {
    return (
      <div className="container p-4 space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 flex-1 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
        <div className="h-[280px] animate-pulse rounded-lg bg-muted" />
        <div className="h-[280px] animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container p-4">
        <div className="flex h-[400px] items-center justify-center">
          <p className="text-destructive">Failed to load data: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const genericPct =
    totals.total > 0 ? (totals.generic / totals.total) * 100 : 0
  const brandedPct =
    totals.total > 0 ? (totals.branded / totals.total) * 100 : 0

  return (
    <div className="container p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Product Performance
        </h1>
        <p className="mt-1 text-muted-foreground">
          Generic vs Branded Analysis · Full Year 2015
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ProductKPICard
          title="Generic Revenue"
          value={formatCurrency(totals.generic)}
          subtitle="AI- prefix medicines"
          percentage={genericPct}
        />
        <ProductKPICard
          title="Branded Revenue"
          value={formatCurrency(totals.branded)}
          subtitle="R- prefix medicines"
          percentage={brandedPct}
        />
        <ProductKPICard
          title="Total SKUs"
          value={totals.skuCount.toLocaleString("id-ID")}
          subtitle="Unique product codes"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RevenueBarChart data={data.product_type_revenue} />
        <MonthlyTrendChart data={data.monthly_trend} />
      </div>

      <SKUQuadrantChart data={data.sku_scatter} />

      <Top20Table data={data.top_20} />

      <InterpretationGuide />
    </div>
  )
}
