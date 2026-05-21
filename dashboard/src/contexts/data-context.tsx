"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

import type { MarginRiskData, OverviewData, ProductsData } from "@/lib/data"
import type { ReactNode } from "react"

import { getMarginRiskData, getOverviewData, getProductsData } from "@/lib/data"

interface DataState {
  overview: OverviewData | null
  products: ProductsData | null
  marginRisk: MarginRiskData | null
}

interface DataFetchingState {
  overviewLoading: boolean
  productsLoading: boolean
  marginRiskLoading: boolean
}

interface DataContextValue extends DataState {
  loading: boolean
  error: string | null
  fetchOverview: () => Promise<void>
  fetchProducts: () => Promise<void>
  fetchMarginRisk: () => Promise<void>
}

const DataContext = createContext<DataContextValue>({
  overview: null,
  products: null,
  marginRisk: null,
  loading: true,
  error: null,
  fetchOverview: async () => {},
  fetchProducts: async () => {},
  fetchMarginRisk: async () => {},
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
  const [fetching, setFetching] = useState<DataFetchingState>({
    overviewLoading: false,
    productsLoading: false,
    marginRiskLoading: false,
  })
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    if (state.overview || fetching.overviewLoading) return
    setFetching((prev) => ({ ...prev, overviewLoading: true }))
    try {
      const data = await getOverviewData()
      setState((prev) => ({ ...prev, overview: data }))
    } catch (e: unknown) {
      setError((prev) => prev ?? (e as Error).message)
    } finally {
      setFetching((prev) => ({ ...prev, overviewLoading: false }))
    }
  }, [state.overview, fetching.overviewLoading])

  const fetchProducts = useCallback(async () => {
    if (state.products || fetching.productsLoading) return
    setFetching((prev) => ({ ...prev, productsLoading: true }))
    try {
      const data = await getProductsData()
      setState((prev) => ({ ...prev, products: data }))
    } catch (e: unknown) {
      setError((prev) => prev ?? (e as Error).message)
    } finally {
      setFetching((prev) => ({ ...prev, productsLoading: false }))
    }
  }, [state.products, fetching.productsLoading])

  const fetchMarginRisk = useCallback(async () => {
    if (state.marginRisk || fetching.marginRiskLoading) return
    setFetching((prev) => ({ ...prev, marginRiskLoading: true }))
    try {
      const data = await getMarginRiskData()
      setState((prev) => ({ ...prev, marginRisk: data }))
    } catch (e: unknown) {
      setError((prev) => prev ?? (e as Error).message)
    } finally {
      setFetching((prev) => ({ ...prev, marginRiskLoading: false }))
    }
  }, [state.marginRisk, fetching.marginRiskLoading])

  const loading =
    !state.overview &&
    !state.products &&
    !state.marginRisk &&
    !fetching.overviewLoading &&
    !fetching.productsLoading &&
    !fetching.marginRiskLoading

  const value = useMemo(
    () => ({
      ...state,
      loading,
      error,
      fetchOverview,
      fetchProducts,
      fetchMarginRisk,
    }),
    [state, loading, error, fetchOverview, fetchProducts, fetchMarginRisk]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
