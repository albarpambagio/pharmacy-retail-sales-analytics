import React from "react"

import { PRODUCT_TYPES } from "@/lib/data"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProductFilterProps {
  productType: string
  onProductTypeChange: (v: string) => void
}

export const ProductFilter = React.memo(function ProductFilter({
  productType,
  onProductTypeChange,
}: ProductFilterProps) {
  return (
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
  )
})
