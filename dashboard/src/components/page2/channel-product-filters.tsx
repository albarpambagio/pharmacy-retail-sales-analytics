"use client"

import { PRODUCT_TYPES, TRANSACTION_TYPES } from "@/lib/data"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ChannelProductFiltersProps {
  transactionType: string
  productType: string
  onTransactionTypeChange: (v: string) => void
  onProductTypeChange: (v: string) => void
}

export function ChannelProductFilters({
  transactionType,
  productType,
  onTransactionTypeChange,
  onProductTypeChange,
}: ChannelProductFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Transaction Type
        </label>
        <Select value={transactionType} onValueChange={onTransactionTypeChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Product Type
        </label>
        <Select value={productType} onValueChange={onProductTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_TYPES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
