"use client"

import React, { useMemo, useState } from "react"
import { ArrowUpDown, Download, Search } from "lucide-react"

import type { Top20SKU } from "@/lib/data"

import { formatCurrency, formatNumber } from "@/lib/data"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Top20TableProps {
  data: Top20SKU[]
}

type SortKey =
  | "kd_obat"
  | "revenue"
  | "avg_margin_pct"
  | "total_qty"
  | "product_type"

export const Top20Table = React.memo(function Top20Table({
  data,
}: Top20TableProps) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("revenue")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const filtered = useMemo(() => {
    if (!search) return data
    const lower = search.toLowerCase()
    return data.filter(
      (d) =>
        d.kd_obat.toLowerCase().includes(lower) ||
        d.product_type.toLowerCase().includes(lower)
    )
  }, [data, search])

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const exportCSV = () => {
    const headers = [
      "SKU",
      "Product Type",
      "Price Tier",
      "Revenue",
      "Margin %",
      "Qty",
    ]
    const rows = sorted.map((d) => [
      d.kd_obat,
      d.product_type,
      d.price_tier,
      d.revenue.toFixed(2),
      d.avg_margin_pct.toFixed(2),
      d.total_qty,
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "top-20-skus.csv"
    a.click()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base">Top 20 SKUs by Revenue</CardTitle>
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
                <th className="text-left py-2 px-2 font-medium">Tier</th>
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
                    onClick={() => handleSort("total_qty")}
                  >
                    Qty
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.kd_obat} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-2 font-mono text-xs">
                    {item.kd_obat}
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.product_type === "Generic"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.product_type}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">
                    {item.price_tier}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {formatCurrency(item.revenue)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {item.avg_margin_pct.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground">
                    {formatNumber(item.total_qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
})
