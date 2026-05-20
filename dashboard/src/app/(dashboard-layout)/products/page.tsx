"use client"

import { useEffect, useMemo, useState } from "react"

import type { ProductsData } from "@/lib/data"

import { formatCurrency, getProductsData } from "@/lib/data"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { OverviewFilters } from "@/components/page1/overview-filters"
import { InterpretationGuide } from "@/components/page2/interpretation-guide"
import { MonthlyTrendChart } from "@/components/page2/monthly-trend-chart"
import { RevenueBarChart } from "@/components/page2/revenue-bar-chart"
import { SKUQuadrantChart } from "@/components/page2/scatter-chart"
import { Top20Table } from "@/components/page2/top-20-table"

export default function ProductsPage() {
  const [data, setData] = useState<ProductsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState("all")
  const [transactionType, setTransactionType] = useState("all")
  const [productType, setProductType] = useState("all")

  useEffect(() => {
    getProductsData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return null

    let productTypeRevenue = [...data.product_type_revenue]
    let monthlyTrend = [...data.monthly_trend]
    const skuScatter = [...data.sku_scatter]
    let top20 = [...data.top_20]

    if (transactionType !== "all") {
      const isOutpatient = transactionType === "outpatient"
      const txnFilter = isOutpatient ? "Outpatient" : "Inpatient"
      const filterByTxn = <T extends { transaction_type: string }>(arr: T[]) =>
        arr.filter((item) => item.transaction_type === txnFilter)
      productTypeRevenue = filterByTxn(productTypeRevenue)
      monthlyTrend = filterByTxn(monthlyTrend)
    }

    if (productType !== "all") {
      const filterType = productType === "generic" ? "Generic" : "Branded"
      const f1 = productTypeRevenue.filter((p) => p.product_type === filterType)
      const f2 = monthlyTrend.filter((m) => m.product_type === filterType)
      const f3 = top20.filter((t) => t.product_type === filterType)
      productTypeRevenue = f1
      monthlyTrend = f2
      top20 = f3
    }

    if (month !== "all") {
      monthlyTrend = monthlyTrend.filter((m) => m.year_month === month)
    }

    return {
      product_type_revenue: productTypeRevenue,
      monthly_trend: monthlyTrend,
      sku_scatter: skuScatter,
      top_20: top20,
    }
  }, [data, month, productType, transactionType])

  if (loading) {
    return (
      <div className="container p-4 space-y-6">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-5 w-96 mt-2 animate-pulse rounded bg-muted" />
        </div>
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
        <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
        <div className="h-[400px] animate-pulse rounded-lg bg-muted" />
        <Skeleton className="h-12 w-full" />
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

  const displayData = filtered || data
  if (!displayData) return null

  const typeRevenue = displayData.product_type_revenue.reduce(
    (acc, cur) => ({ ...acc, [cur.product_type]: cur.revenue }),
    {} as Record<string, number>
  )
  const generic = typeRevenue.Generic || 0
  const branded = typeRevenue.Branded || 0
  const total = generic + branded
  const skuCount = displayData.sku_scatter.length

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

      <OverviewFilters
        month={month}
        transactionType={transactionType}
        productType={productType}
        onMonthChange={setMonth}
        onTransactionTypeChange={setTransactionType}
        onProductTypeChange={setProductType}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {skuCount.toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RevenueBarChart data={displayData.product_type_revenue} />
        <MonthlyTrendChart data={displayData.monthly_trend} />
      </div>

      <SKUQuadrantChart data={displayData.sku_scatter} />

      <Top20Table data={displayData.top_20} />

      <InterpretationGuide />
    </div>
  )
}
