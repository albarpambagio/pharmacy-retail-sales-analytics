"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"

import { MONTHS, formatCurrency } from "@/lib/data"

import { useData } from "@/contexts/data-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ChannelProductFilters } from "@/components/page2/channel-product-filters"
import { InterpretationGuide } from "@/components/page2/interpretation-guide"
import { MonthlyTrendChart } from "@/components/page2/monthly-trend-chart"
import { RevenueBarChart } from "@/components/page2/revenue-bar-chart"

const SKUQuadrantChart = dynamic(
  () =>
    import("@/components/page2/scatter-chart").then((m) => m.SKUQuadrantChart),
  {
    loading: () => (
      <div className="h-[300px] animate-pulse rounded-lg bg-muted" />
    ),
  }
)
const Top20Table = dynamic(
  () => import("@/components/page2/top-20-table").then((m) => m.Top20Table),
  { loading: () => <Skeleton className="h-12 w-full" /> }
)

export default function ProductsPage() {
  const { products: data, loading, fetchProducts } = useData()
  const [month, setMonth] = useState("all")
  const [transactionType, setTransactionType] = useState("all")
  const [productType, setProductType] = useState("all")

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const channelFiltered = useMemo(() => {
    if (!data) return null

    let productTypeRevenue = [...data.product_type_revenue]
    let monthlyTrend = [...data.monthly_trend]
    let top20 = [...data.top_20]

    if (transactionType !== "all") {
      const isOutpatient = transactionType === "outpatient"
      const txnFilter = isOutpatient ? "Outpatient" : "Inpatient"
      productTypeRevenue = productTypeRevenue.filter(
        (item) => item.transaction_type === txnFilter
      )
      monthlyTrend = monthlyTrend.filter(
        (item) => item.transaction_type === txnFilter
      )
    }

    if (productType !== "all") {
      const filterType = productType === "generic" ? "Generic" : "Branded"
      productTypeRevenue = productTypeRevenue.filter(
        (p) => p.product_type === filterType
      )
      monthlyTrend = monthlyTrend.filter((m) => m.product_type === filterType)
      top20 = top20.filter((t) => t.product_type === filterType)
    }

    return {
      product_type_revenue: productTypeRevenue,
      monthly_trend: monthlyTrend,
      top_20: top20,
    }
  }, [data, productType, transactionType])

  const monthlyTrendFiltered = useMemo(() => {
    if (!channelFiltered) return channelFiltered
    if (month === "all") return channelFiltered

    return {
      ...channelFiltered,
      monthly_trend: channelFiltered.monthly_trend.filter(
        (m) => m.year_month === month
      ),
    }
  }, [channelFiltered, month])

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

  if (!data || !channelFiltered) return null

  const typeRevenue = channelFiltered.product_type_revenue.reduce(
    (acc, cur) => ({ ...acc, [cur.product_type]: cur.revenue }),
    {} as Record<string, number>
  )
  const generic = typeRevenue.Generic || 0
  const branded = typeRevenue.Branded || 0
  const total = generic + branded
  const skuCount =
    productType === "all"
      ? data.sku_scatter.length
      : data.sku_scatter.filter(
          (s) =>
            s.product_type ===
            (productType === "generic" ? "Generic" : "Branded")
        ).length

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

      <ChannelProductFilters
        transactionType={transactionType}
        productType={productType}
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
        <RevenueBarChart data={channelFiltered.product_type_revenue} />
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Monthly Trend by Product Type
              </CardTitle>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <MonthlyTrendChart data={monthlyTrendFiltered!.monthly_trend} />
            </div>
          </CardContent>
        </Card>
      </div>

      <SKUQuadrantChart data={data.sku_scatter} />

      <Top20Table data={channelFiltered.top_20} />

      <InterpretationGuide />
    </div>
  )
}
