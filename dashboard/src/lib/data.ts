const dataCache: Record<string, unknown> = {}
const CACHE_TTL = process.env.NODE_ENV === "development" ? 60_000 : 300_000
const cacheTimestamps: Record<string, number> = {}

function isCacheExpired(key: string): boolean {
  const ts = cacheTimestamps[key]
  if (!ts) return true
  return Date.now() - ts > CACHE_TTL
}

function loadFromSessionStorage(key: string): unknown | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(`pharmacy_cache_${key}`)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL) {
      sessionStorage.removeItem(`pharmacy_cache_${key}`)
      return null
    }
    return data
  } catch {
    return null
  }
}

function saveToSessionStorage(key: string, data: unknown): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(
      `pharmacy_cache_${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    )
  } catch {
    // sessionStorage full or unavailable — degrade gracefully
  }
}

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
  if (dataCache.overview && !isCacheExpired("overview")) {
    return dataCache.overview as OverviewData
  }
  const cached = loadFromSessionStorage("overview")
  if (cached) {
    dataCache.overview = cached
    cacheTimestamps.overview = Date.now()
    return cached as OverviewData
  }
  const res = await fetch("/data/overview.json")
  if (!res.ok) throw new Error("Failed to fetch overview data")
  const data = await res.json()
  dataCache.overview = data
  cacheTimestamps.overview = Date.now()
  saveToSessionStorage("overview", data)
  return data
}

export const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "2015-01", label: "January" },
  { value: "2015-02", label: "February" },
  { value: "2015-03", label: "March" },
  { value: "2015-04", label: "April" },
  { value: "2015-05", label: "May" },
  { value: "2015-06", label: "June" },
  { value: "2015-07", label: "July" },
  { value: "2015-08", label: "August" },
  { value: "2015-09", label: "September" },
  { value: "2015-10", label: "October" },
  { value: "2015-11", label: "November" },
  { value: "2015-12", label: "December" },
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
  if (dataCache.products && !isCacheExpired("products")) {
    return dataCache.products as ProductsData
  }
  const cached = loadFromSessionStorage("products")
  if (cached) {
    dataCache.products = cached
    cacheTimestamps.products = Date.now()
    return cached as ProductsData
  }
  const res = await fetch("/data/products.json")
  if (!res.ok) throw new Error("Failed to fetch products data")
  const data = await res.json()
  dataCache.products = data
  cacheTimestamps.products = Date.now()
  saveToSessionStorage("products", data)
  return data
}

export interface MarginSKU {
  kd_obat: string
  product_type: string
  total_qty: number
  revenue: number
  avg_margin_pct: number
  avg_hna: number
  avg_hj: number
}

export interface HistogramBin {
  bin_start: number
  bin_end: number
  count: number
}

export interface MarginRiskData {
  skus: MarginSKU[]
  histogram: HistogramBin[]
  min_margin: number
  max_margin: number
}

export async function getMarginRiskData(): Promise<MarginRiskData> {
  if (dataCache.marginRisk && !isCacheExpired("marginRisk")) {
    return dataCache.marginRisk as MarginRiskData
  }
  const cached = loadFromSessionStorage("marginRisk")
  if (cached) {
    dataCache.marginRisk = cached
    cacheTimestamps.marginRisk = Date.now()
    return cached as MarginRiskData
  }
  const res = await fetch("/data/margin_risk.json")
  if (!res.ok) throw new Error("Failed to fetch margin risk data")
  const data = await res.json()
  dataCache.marginRisk = data
  cacheTimestamps.marginRisk = Date.now()
  saveToSessionStorage("marginRisk", data)
  return data
}
