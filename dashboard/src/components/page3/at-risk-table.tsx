"use client"

import React, { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Download, Search } from "lucide-react"

import type { MarginSKU } from "@/lib/data"

import { formatCurrency, formatNumber } from "@/lib/data"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface AtRiskTableProps {
  skus: MarginSKU[]
  threshold: number
}

type SortKey =
  | "kd_obat"
  | "revenue"
  | "avg_margin_pct"
  | "total_qty"
  | "product_type"
  | "avg_hna"
  | "avg_hj"

export const AtRiskTable = React.memo(function AtRiskTable({
  skus,
  threshold,
}: AtRiskTableProps) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("revenue")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const pageSize = 25

  const filtered = useMemo(() => {
    if (!search) return skus
    const lower = search.toLowerCase()
    return skus.filter(
      (s) =>
        s.kd_obat.toLowerCase().includes(lower) ||
        s.product_type.toLowerCase().includes(lower)
    )
  }, [skus, search])

  useEffect(() => {
    setPage(1)
  }, [skus, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
    setPage(1)
  }

  const exportCSV = () => {
    const headers = [
      "SKU",
      "Product Type",
      "Total Qty",
      "Revenue",
      "Margin %",
      "Avg HNA",
      "Avg HJ",
    ]
    const rows = sorted.map((s) => [
      s.kd_obat,
      s.product_type,
      s.total_qty,
      s.revenue.toFixed(2),
      s.avg_margin_pct.toFixed(2),
      s.avg_hna.toFixed(2),
      s.avg_hj.toFixed(2),
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `at-risk-skus-below-${threshold}pct.csv`
    a.click()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base">
          At-Risk SKUs (Below {threshold}%)
        </CardTitle>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-[180px] h-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-8"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {sorted.length} SKU{sorted.length !== 1 ? "s" : ""} with margin below{" "}
          {threshold}%
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort("kd_obat")}
                  >
                    SKU
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left py-2 px-2 font-medium">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort("product_type")}
                  >
                    Type
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-right py-2 px-2 font-medium">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => handleSort("total_qty")}
                  >
                    Qty
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-right py-2 px-2 font-medium">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => handleSort("revenue")}
                  >
                    Revenue
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-right py-2 px-2 font-medium">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => handleSort("avg_margin_pct")}
                  >
                    Margin %
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-right py-2 px-2 font-medium">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => handleSort("avg_hna")}
                  >
                    Avg HNA
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-right py-2 px-2 font-medium">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    onClick={() => handleSort("avg_hj")}
                  >
                    Avg HJ
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => {
                const isNegative = s.avg_margin_pct < 0
                return (
                  <tr
                    key={s.kd_obat}
                    className={`border-b hover:bg-muted/50 ${
                      isNegative ? "bg-destructive/5" : ""
                    }`}
                  >
                    <td className="py-2 px-2 font-mono text-xs">{s.kd_obat}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          s.product_type === "Generic"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {s.product_type}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {formatNumber(s.total_qty)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {formatCurrency(s.revenue)}
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-medium ${
                        isNegative
                          ? "text-destructive"
                          : s.avg_margin_pct < threshold * 0.5
                            ? "text-amber-600"
                            : ""
                      }`}
                    >
                      {s.avg_margin_pct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {formatCurrency(s.avg_hna)}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {formatCurrency(s.avg_hj)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <p className="text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, sorted.length)} of {sorted.length}
            </p>
            <div className="flex gap-1">
              <button
                className="rounded border px-3 py-1 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true
                  if (p === 1 || p === totalPages) return true
                  if (Math.abs(p - page) <= 1) return true
                  return false
                })
                .reduce<(number | string)[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...")
                  acc.push(p)
                  return acc
                }, [])
                .map((item, i) =>
                  typeof item === "string" ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-1">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      className={`rounded border px-3 py-1 hover:bg-muted transition-colors ${
                        item === page
                          ? "bg-primary text-primary-foreground"
                          : ""
                      }`}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                className="rounded border px-3 py-1 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
