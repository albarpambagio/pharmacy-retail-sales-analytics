const dataCache: Record<string, unknown> = {}

export interface MonthlyData {
  year_month: string
  revenue: number
  transactions: number
  avg_margin_pct: number
  revenue_outpatient: number | null
  revenue_inpatient: number | null
  revenue_generic: number | null
  revenue_branded: number | null
}

export interface OverviewData {
  total_revenue: number
  total_transactions: number
  avg_margin_pct: number
  monthly: MonthlyData[]
}

export async function getOverviewData(): Promise<OverviewData> {
  if (dataCache.overview) {
    return dataCache.overview as OverviewData
  }
  const res = await fetch("/data/overview.json")
  if (!res.ok) throw new Error("Failed to fetch overview data")
  const data = await res.json()
  dataCache.overview = data
  return data
}

export const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "2015-01", label: "January" },
  { value: "2015-03", label: "March" },
  { value: "2015-04", label: "April" },
  { value: "2015-08", label: "August" },
  { value: "2015-09", label: "September" },
]

export const TRANSACTION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "outpatient", label: "Outpatient (RJ)" },
  { value: "inpatient", label: "Inpatient (RI)" },
]

export const PRODUCT_TYPES = [
  { value: "all", label: "All Products" },
  { value: "generic", label: "Generic" },
  { value: "branded", label: "Branded" },
]

export function formatCurrency(value: number): string {
  if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `Rp ${(value / 1e3).toFixed(1)}K`
  return `Rp ${value.toFixed(0)}`
}

export function formatNumber(value: number): string {
  return value.toLocaleString("id-ID")
}

export interface ProductTypeRevenue {
  product_type: string
  transaction_type: string
  revenue: number
  transactions: number
  avg_margin_pct: number
}

export interface MonthlyTrend {
  year_month: string
  product_type: string
  transaction_type: string
  revenue: number
  transactions: number
}

export interface SKUScatter {
  kd_obat: string
  product_type: string
  revenue: number
  avg_margin_pct: number | null
  total_qty: number
  transaction_count: number
}

export interface Top20SKU {
  kd_obat: string
  product_type: string
  price_tier: string
  revenue: number
  avg_margin_pct: number
  total_qty: number
}

export interface ProductsData {
  product_type_revenue: ProductTypeRevenue[]
  monthly_trend: MonthlyTrend[]
  sku_scatter: SKUScatter[]
  top_20: Top20SKU[]
}

export async function getProductsData(): Promise<ProductsData> {
  if (dataCache.products) {
    return dataCache.products as ProductsData
  }
  const res = await fetch("/data/products.json")
  if (!res.ok) throw new Error("Failed to fetch products data")
  const data = await res.json()
  dataCache.products = data
  return data
}
