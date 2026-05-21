"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"

import type { MonthlyData } from "@/lib/data"

import { formatCurrency, formatNumber } from "@/lib/data"

import { useData } from "@/contexts/data-context"
import { InterpretationGuide } from "@/components/page1/interpretation-guide"
import { KPICard } from "@/components/page1/kpi-card"
import { OverviewFilters } from "@/components/page1/overview-filters"
import { SummaryTable } from "@/components/page1/summary-table"

const MonthlyRevenueChart = dynamic(
  () =>
    import("@/components/page1/monthly-revenue-chart").then(
      (m) => m.MonthlyRevenueChart
    ),
  {
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg bg-muted" />
    ),
  }
)
const RevenueMixChart = dynamic(
  () =>
    import("@/components/page1/revenue-mix-chart").then(
      (m) => m.RevenueMixChart
    ),
  {
    loading: () => (
      <div className="h-[240px] animate-pulse rounded-lg bg-muted" />
    ),
  }
)

export default function OverviewPage() {
  const { overview: data, overviewLoading, fetchOverview } = useData()
  const [month, setMonth] = useState("all")
  const [transactionType, setTransactionType] = useState("all")
  const [productType, setProductType] = useState("all")

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const filtered = useMemo(() => {
    if (!data)
      return {
        monthly: [] as MonthlyData[],
        totalRevenue: 0,
        totalTransactions: 0,
        avgMargin: 0,
      }

    let monthly = data.monthly

    if (month !== "all") {
      monthly = monthly.filter((m) => m.year_month === month)
    }

    const displayMonthly = monthly.map((m) => {
      let revenue = m.revenue
      if (transactionType === "outpatient") {
        revenue = m.revenue_outpatient ?? 0
      } else if (transactionType === "inpatient") {
        revenue = m.revenue_inpatient ?? 0
      }
      if (productType === "generic") {
        revenue = m.revenue_generic ?? 0
      } else if (productType === "branded") {
        revenue = m.revenue_branded ?? 0
      }
      return { ...m, revenue }
    })

    const totalRevenue = displayMonthly.reduce((s, m) => s + m.revenue, 0)
    const totalTransactions = displayMonthly.reduce(
      (s, m) => s + m.transactions,
      0
    )
    const totalWeighted = displayMonthly.reduce(
      (s, m) => s + m.revenue * (m.avg_margin_pct / 100),
      0
    )
    const avgMargin =
      totalRevenue > 0 ? (totalWeighted / totalRevenue) * 100 : 0

    return {
      monthly: displayMonthly,
      totalRevenue,
      totalTransactions,
      avgMargin,
    }
  }, [data, month, transactionType, productType])

  const prevMonth = useMemo(() => {
    if (!data || month !== "all") return null
    const sorted = [...filtered.monthly].sort((a, b) =>
      a.year_month.localeCompare(b.year_month)
    )
    if (sorted.length < 2) return null
    const last = sorted[sorted.length - 1]
    const prev = sorted[sorted.length - 2]
    return {
      revenue:
        prev.revenue > 0
          ? ((last.revenue - prev.revenue) / prev.revenue) * 100
          : 0,
      transactions:
        prev.transactions > 0
          ? ((last.transactions - prev.transactions) / prev.transactions) * 100
          : 0,
      margin: last.avg_margin_pct - prev.avg_margin_pct,
      lastMonth: last.year_month,
      prevMonth: prev.year_month,
    }
  }, [filtered.monthly, data, month])

  if (overviewLoading) {
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
        <div className="h-[240px] animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Executive Overview
        </h1>
        <p className="mt-1 text-muted-foreground">
          Hospital Pharmacy Performance · Full Year 2015
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

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(filtered.totalRevenue)}
          subtitle="Full year 2015"
          delta={prevMonth?.revenue}
          deltaLabel={prevMonth ? `vs ${prevMonth.prevMonth}` : undefined}
        />
        <KPICard
          title="Total Transactions"
          value={formatNumber(filtered.totalTransactions)}
          subtitle="Full year 2015"
          delta={prevMonth?.transactions}
          deltaLabel={prevMonth ? `vs ${prevMonth.prevMonth}` : undefined}
        />
        <KPICard
          title="Avg Margin %"
          value={`${filtered.avgMargin.toFixed(1)}%`}
          subtitle="Full year 2015"
          delta={prevMonth?.margin}
          deltaLabel={prevMonth ? `vs ${prevMonth.prevMonth}` : undefined}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MonthlyRevenueChart data={filtered.monthly} />
        <RevenueMixChart data={filtered.monthly} />
      </div>

      <SummaryTable
        data={filtered.monthly}
        overallAvgMargin={filtered.avgMargin}
      />

      <InterpretationGuide />
    </div>
  )
}
