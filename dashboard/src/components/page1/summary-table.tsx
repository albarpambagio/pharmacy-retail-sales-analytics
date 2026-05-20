"use client"

import { useMemo, useState } from "react"

import type { MonthlyData } from "@/lib/data"

import { formatNumber } from "@/lib/data"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SummaryTableProps {
  data: MonthlyData[]
  overallAvgMargin: number
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

type SortKey = "month" | "revenue" | "transactions" | "margin" | "mix"
type SortDir = "asc" | "desc"

export function SummaryTable({ data, overallAvgMargin }: SummaryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("month")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const sorted = useMemo(() => {
    const arr = [...data]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "month":
          cmp = a.year_month.localeCompare(b.year_month)
          break
        case "revenue":
          cmp = a.revenue - b.revenue
          break
        case "transactions":
          cmp = a.transactions - b.transactions
          break
        case "margin":
          cmp = a.avg_margin_pct - b.avg_margin_pct
          break
        case "mix": {
          const aPct =
            a.revenue_outpatient != null &&
            a.revenue_outpatient + (a.revenue_inpatient ?? 0) > 0
              ? (a.revenue_outpatient /
                  (a.revenue_outpatient + (a.revenue_inpatient ?? 0))) *
                100
              : 0
          const bPct =
            b.revenue_outpatient != null &&
            b.revenue_outpatient + (b.revenue_inpatient ?? 0) > 0
              ? (b.revenue_outpatient /
                  (b.revenue_outpatient + (b.revenue_inpatient ?? 0))) *
                100
              : 0
          cmp = aPct - bPct
          break
        }
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return arr
  }, [data, sortKey, sortDir])

  const totals = useMemo(() => {
    const totalRev = data.reduce((s, d) => s + d.revenue, 0)
    const totalTxn = data.reduce((s, d) => s + d.transactions, 0)
    const totalOutpatient = data.reduce(
      (s, d) => s + (d.revenue_outpatient ?? 0),
      0
    )
    const mixPct = totalRev > 0 ? (totalOutpatient / totalRev) * 100 : 0
    return { revenue: totalRev, transactions: totalTxn, mixPct }
  }, [data])

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 0)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No data for selected filters
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Performance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("month")}
                >
                  Month
                  <SortIndicator column="month" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort("revenue")}
                >
                  Revenue (IDR)
                  <SortIndicator column="revenue" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort("transactions")}
                >
                  Transactions
                  <SortIndicator column="transactions" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort("margin")}
                >
                  Avg Margin %<SortIndicator column="margin" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort("mix")}
                >
                  Mix RJ%
                  <SortIndicator column="mix" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((d) => {
                const mixPct =
                  d.revenue_outpatient != null &&
                  d.revenue_outpatient + (d.revenue_inpatient ?? 0) > 0
                    ? (d.revenue_outpatient /
                        (d.revenue_outpatient + (d.revenue_inpatient ?? 0))) *
                      100
                    : 0
                const isMaxRev = d.revenue === maxRevenue
                const isLowMargin = d.avg_margin_pct < overallAvgMargin

                return (
                  <TableRow
                    key={d.year_month}
                    className={isMaxRev ? "font-bold" : ""}
                  >
                    <TableCell>
                      {MONTH_LABELS[d.year_month] || d.year_month}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(Math.round(d.revenue))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(d.transactions)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${isLowMargin ? "text-red-500" : ""}`}
                    >
                      {d.avg_margin_pct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {mixPct.toFixed(0)}%
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="border-t-2 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">
                  {formatNumber(Math.round(totals.revenue))}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(totals.transactions)}
                </TableCell>
                <TableCell className="text-right">
                  {overallAvgMargin.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  {totals.mixPct.toFixed(0)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
