export interface MonthlyData {
  year_month: string
  revenue: number
  transactions: number
  avg_margin_pct: number
  revenue_outpatient: number | null
  revenue_inpatient: number | null
}

export interface OverviewData {
  total_revenue: number
  total_transactions: number
  avg_margin_pct: number
  monthly: MonthlyData[]
}

export async function getOverviewData(): Promise<OverviewData> {
  const res = await fetch("/data/overview.json")
  if (!res.ok) throw new Error("Failed to fetch overview data")
  return res.json()
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
