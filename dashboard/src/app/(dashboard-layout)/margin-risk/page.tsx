"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"

import { useDebounce } from "@/hooks/use-debounce"
import { useData } from "@/contexts/data-context"
import { Skeleton } from "@/components/ui/skeleton"
import { InterpretationGuide } from "@/components/page3/interpretation-guide"
import { ProductFilter } from "@/components/page3/product-filter"
import { RiskKPICards } from "@/components/page3/risk-kpi-cards"
import { ThresholdSlider } from "@/components/page3/threshold-slider"

const AtRiskTable = dynamic(
  () => import("@/components/page3/at-risk-table").then((m) => m.AtRiskTable),
  { loading: () => <Skeleton className="h-[400px] w-full" /> }
)
const MarginHistogram = dynamic(
  () =>
    import("@/components/page3/margin-histogram").then(
      (m) => m.MarginHistogram
    ),
  {
    loading: () => (
      <div className="h-[320px] animate-pulse rounded-lg bg-muted" />
    ),
  }
)
const MarginScatterChart = dynamic(
  () =>
    import("@/components/page3/margin-scatter-chart").then(
      (m) => m.MarginScatterChart
    ),
  {
    loading: () => (
      <div className="h-[320px] animate-pulse rounded-lg bg-muted" />
    ),
  }
)

export default function MarginRiskPage() {
  const { marginRisk: data, marginRiskLoading, fetchMarginRisk } = useData()
  const [threshold, setThreshold] = useState(10)
  const [productType, setProductType] = useState("all")

  useEffect(() => {
    fetchMarginRisk()
  }, [fetchMarginRisk])

  const debouncedThreshold = useDebounce(threshold, 120)

  const filteredSkus = useMemo(() => {
    if (!data?.skus) return []
    if (productType === "all") return data.skus
    const filterType = productType === "generic" ? "Generic" : "Branded"
    return data.skus.filter((s) => s.product_type === filterType)
  }, [data, productType])

  const sortedSkus = useMemo(() => {
    return [...filteredSkus].sort((a, b) => b.revenue - a.revenue)
  }, [filteredSkus])

  const atRiskSKUs = useMemo(() => {
    return filteredSkus.filter(
      (s) => s.avg_margin_pct !== null && s.avg_margin_pct < debouncedThreshold
    )
  }, [filteredSkus, debouncedThreshold])

  const kpiValues = useMemo(() => {
    const revenueAtRisk = atRiskSKUs.reduce((sum, s) => sum + s.revenue, 0)
    const avgMarginAtRisk =
      atRiskSKUs.length > 0
        ? atRiskSKUs.reduce((sum, s) => sum + s.avg_margin_pct, 0) /
          atRiskSKUs.length
        : 0
    return {
      atRiskCount: atRiskSKUs.length,
      revenueAtRisk,
      avgMarginAtRisk,
      totalSKUs: filteredSkus.length,
    }
  }, [atRiskSKUs, filteredSkus.length])

  if (marginRiskLoading) {
    return (
      <div className="container p-4 space-y-6">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-5 w-80 mt-2 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 flex-1 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-[320px] animate-pulse rounded-lg bg-muted" />
          <div className="h-[320px] animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-[400px] animate-pulse rounded-lg bg-muted" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Margin Risk</h1>
        <p className="mt-1 text-muted-foreground">
          SKU Margin Analysis & Pricing Review · Full Year 2015
        </p>
      </div>

      <ThresholdSlider value={threshold} onChange={setThreshold} />

      <ProductFilter
        productType={productType}
        onProductTypeChange={setProductType}
      />

      <RiskKPICards
        atRiskCount={kpiValues.atRiskCount}
        revenueAtRisk={kpiValues.revenueAtRisk}
        avgMarginAtRisk={kpiValues.avgMarginAtRisk}
        totalSKUs={kpiValues.totalSKUs}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <MarginScatterChart skus={sortedSkus} threshold={debouncedThreshold} />
        <MarginHistogram skus={sortedSkus} threshold={debouncedThreshold} />
      </div>

      <AtRiskTable skus={atRiskSKUs} threshold={debouncedThreshold} />

      <InterpretationGuide />
    </div>
  )
}
