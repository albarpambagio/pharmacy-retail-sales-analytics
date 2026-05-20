"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

import type { MarginRiskData, OverviewData, ProductsData } from "@/lib/data"
import type { ReactNode } from "react"

import { getMarginRiskData, getOverviewData, getProductsData } from "@/lib/data"

interface DataState {
  overview: OverviewData | null
  products: ProductsData | null
  marginRisk: MarginRiskData | null
}

interface DataContextValue extends DataState {
  loading: boolean
  error: string | null
}

const DataContext = createContext<DataContextValue>({
  overview: null,
  products: null,
  marginRisk: null,
  loading: true,
  error: null,
})

export function useData() {
  return useContext(DataContext)
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({
    overview: null,
    products: null,
    marginRisk: null,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getOverviewData().catch((e) => {
        if (!cancelled) setError(e.message)
        return null
      }),
      getProductsData().catch(() => null),
      getMarginRiskData().catch(() => null),
    ]).then(([ov, pr, mr]) => {
      if (!cancelled) {
        setState({
          overview: ov ?? null,
          products: pr ?? null,
          marginRisk: mr ?? null,
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const loading = !state.overview && !state.products && !state.marginRisk

  const value = useMemo(
    () => ({ ...state, loading, error }),
    [state, loading, error]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
