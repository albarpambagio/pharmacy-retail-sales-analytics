# Engineering Learnings

This document captures key technical learnings, bugs encountered, and solutions discovered during the Pharmacy Retail Sales Analytics dashboard development.

---

## 1. Dashboard Architecture & Routing

### How Next.js Route Groups Work

Next.js App Router uses folder structure to determine layouts and page hierarchy. Route groups, denoted by parentheses like `(dashboard-layout)`, allow grouping routes without affecting the URL path.

```
src/app/
├── (dashboard-layout)/
│   ├── layout.tsx      # Shared layout (sidebar, header)
│   ├── page.tsx       # / (overview page)
│   └── products/
│       └── page.tsx   # /products
├── layout.tsx          # Root layout (providers, fonts)
└── globals.css
```

### The Gotcha: Layout Inheritance

**Problem:** The sidebar was missing on the `/products` page while appearing correctly on `/`.

**Root Cause:** The `products` folder was created at `app/products/` instead of inside `app/(dashboard-layout)/`. Pages outside a route group do not inherit the parent layout.

**Solution:**
```bash
# Wrong structure (before)
app/
├── products/page.tsx        # No layout inheritance
└── (dashboard-layout)/page.tsx  # Has layout

# Correct structure (after)
app/
└── (dashboard-layout)/
    ├── page.tsx             # / with sidebar
    └── products/page.tsx   # /products with sidebar
```

**Command to fix:**
```powershell
Move-Item -Path "app\products" -Destination "app\(dashboard-layout)\products"
```

---

## 2. Data Fetching & Caching

### The Problem

Initial page navigation took 18+ seconds, and subsequent page switches took 1-2 seconds despite using static JSON files.

**Observed timings:**
- First `/`: 18.4s (5390 modules compiled)
- First `/products`: 1.7s (reused compiled modules)
- Subsequent navigations: 1-2s

**Root Cause:** Each page navigation triggered a fresh `fetch()` call to load JSON data from `/public/data/`. Even though the files were local, the browser still made HTTP requests.

### Solution: In-Memory Cache

Added a simple cache object in `lib/data.ts` to store fetched data in memory:

```typescript
// src/lib/data.ts
const dataCache: Record<string, unknown> = {}

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
```

### Result

After implementing the cache:
- First load: 18s (compilation overhead, unavoidable)
- Subsequent navigations: **15-31ms**

### Why Not React Query?

For this use case, React Query would add unnecessary complexity. The data:
- Is static (never changes during a session)
- Is small (< 1MB JSON files)
- Only needs to be fetched once per session

A simple in-memory cache is the right tool for this job.

---

## 3. Component Loading States

### The Problem: "About This Dashboard" Not Clickable

When clicking "About This Dashboard" on Page 2 (Product Performance), nothing happened. After a few seconds, it started working.

**Investigation:** The component used `useState(false)` and toggled on click. Code looked correct.

**Root Cause:** The Interpretation Guide component was not rendered during the loading state. The page followed this pattern:

```typescript
if (loading) {
  return <skeleton placeholders />
}

return (
  <div>
    <InterpretationGuide />  {/* Only rendered AFTER loading completes */}
  </div>
)
```

During the loading phase (1-2 seconds), the component did not exist in the DOM. Clicks were ignored because there was nothing to click on.

### Solution: Render Skeleton During Loading

Updated the loading state to match the full page structure, including a skeleton for the Interpretation Guide:

```typescript
if (loading) {
  return (
    <div className="container p-4 space-y-6">
      {/* ... other skeletons ... */}
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
```

Now the component is in the DOM immediately and is clickable as soon as the page renders, even while data is loading.

---

## 4. Build & Development Issues

### CSS 404 Errors on Page Switch

**Error:**
```
GET /_next/static/css/app/layout.css?v=... 404
```

**Root Cause:** Stale `.next` cache from previous development sessions. The dev server referenced CSS files that no longer existed after code changes.

**Solution:**
```powershell
# Stop dev server (Ctrl+C)
Remove-Item -Recurse -Force .next
npm run dev
```

**Prevention:** Clear `.next` whenever you see persistent 404 errors after making structural changes to the app.

---

### Recharts Tooltip Formatter Type Error

**Error:**
```
Type '(value: number) => [string, string]' is not assignable to type 'Formatter<ValueType, NameType>'
```

**Root Cause:** Recharts' Tooltip `formatter` prop expects a specific function signature that TypeScript couldn't verify as compatible with `number`.

**Solution:** Remove explicit type annotation and use type coercion:

```typescript
// Before (error)
<Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />

// After (works)
<Tooltip formatter={(value) => [formatCurrency(Number(value) || 0), "Revenue"]} />
```

**Files affected:**
- `components/page2/monthly-trend-chart.tsx`
- `components/page2/revenue-bar-chart.tsx`
- `components/page2/scatter-chart.tsx`

---

### Prettier Formatting Failures

After writing new components, build failed due to Prettier formatting rules.

**Solution:** Run auto-format before build:
```bash
cd dashboard
npx prettier --write "src/components/page2/**" "src/app/products/**"
```

**Prevention:** Configure editor to format on save, or run Prettier as part of pre-commit hooks.

---

## 5. Sidebar Disappearance Bug

Documented in Section 1 above. Summary:

| Aspect | Detail |
|--------|--------|
| Symptom | Sidebar present on `/` but missing on `/products` |
| Root Cause | Page folder outside route group |
| Solution | Move `app/products` into `app/(dashboard-layout)/products` |
| Files Changed | Moved entire `products/` folder |

---

## 6. React Hooks Rules Violation

### The Problem

Build failed with error:
```
React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render.
```

**Root Cause:** The `useMemo` hook for filtered data was placed AFTER an early `return` statement (loading state check). React hooks must always be called in the same order on every render.

**Wrong pattern:**
```typescript
if (loading) {
  return <Skeleton />  // Early return
}

const filtered = useMemo(() => { ... }, [data])  // Hook AFTER return — VIOLATION
```

**Correct pattern:**
```typescript
const filtered = useMemo(() => { ... }, [data])  // Hook BEFORE any return

if (loading) {
  return <Skeleton />
}
```

**Rule:** All React hooks (`useState`, `useMemo`, `useEffect`, etc.) must be called at the top level of the component, before any conditional returns.

---

## 7. Array.filter() Does Not Mutate In Place

### The Problem

Filters on Page 2 were not working — selecting a filter had no effect on the displayed data.

**Root Cause:** The `.filter()` method returns a NEW array. The original code called `.filter()` but never assigned the result:

```typescript
// Bug — filter result discarded
productTypeRevenue.filter((p) => p.product_type === filterType)
monthlyTrend.filter((m) => m.product_type === filterType)
```

**Solution:** Assign the filtered result back to the variable:
```typescript
productTypeRevenue = productTypeRevenue.filter((p) => p.product_type === filterType)
monthlyTrend = monthlyTrend.filter((m) => m.product_type === filterType)
```

**Key takeaway:** `Array.filter()`, `Array.map()`, `Array.sort()` all return NEW arrays. They do NOT mutate the original. Always capture the return value.

---

## 8. Global Filter Pattern Across Pages

### Architecture

Global filters (Month, Transaction Type, Product Type) are implemented per-page with local state and `useMemo` filtering. Each page:

1. Declares filter state: `useState("all")` for each filter dimension
2. Renders `<OverviewFilters />` component for the filter UI
3. Uses `useMemo` to compute filtered data from raw data + filter states
4. Passes filtered data to all child components (charts, tables, KPI cards)

### Data Requirements

For filters to work, the JSON data must include the necessary breakdown fields:

| Filter | Required Data Fields |
|--------|---------------------|
| Month | `year_month` in each data row |
| Transaction Type | `transaction_type` or `revenue_outpatient`/`revenue_inpatient` |
| Product Type | `product_type` or `revenue_generic`/`revenue_branded` |

### ETL Updates Required

When adding new filter dimensions, the ETL export must be updated to include the necessary fields:

```python
# overview.json — added product type breakdown
SUM(f.revenue) FILTER (WHERE p.product_type = 'Generic')::float AS revenue_generic,
SUM(f.revenue) FILTER (WHERE p.product_type = 'Branded')::float AS revenue_branded

# products.json — added transaction type breakdown
SELECT p.product_type, t.transaction_type, SUM(f.revenue) ...
GROUP BY p.product_type, t.transaction_type
```

---

## 9. KPI Cards Should Reflect Filtered Data

### The Pattern

KPI cards must derive their values from the **filtered** dataset, not the raw data. This ensures that when users apply filters, the summary numbers update accordingly.

**Correct pattern:**
```typescript
const filtered = useMemo(() => { /* apply filters */ }, [data, month, productType])
const displayData = filtered || data

// Cards use displayData, not raw data
const total = displayData.product_type_revenue.reduce(...)
```

**Cards should be simple:**
- Show the aggregated total that reflects current filter state
- Avoid redundant breakdowns that duplicate what charts already show
- Let the charts and tables provide the detailed breakdown

---

## 10. Quick Reference

### Common Commands

| Issue | Command |
|-------|---------|
| Clear stale cache | `Remove-Item -Recurse -Force .next` |
| Auto-fix formatting | `npx prettier --write "src/**/*.{ts,tsx}"` |
| Rebuild | `npm run build` |
| Start dev server | `npm run dev` |

### Debugging Checklist

When encountering issues:

1. **Clear `.next` cache** — most mysterious dev server issues are cache-related
2. **Check folder structure** — ensure pages are in the correct route group for layout inheritance
3. **Verify component is rendered** — check if the component exists in DOM during the problematic state
4. **Check browser console** — network errors, React errors
5. **Check server terminal** — build errors, compilation messages

---

## 11. React Context for Centralized Data Loading

### The Problem

Each page fetched its own JSON data independently via `fetch()` in a `useEffect`. This meant:
- Page 1 loaded `overview.json`
- Page 2 loaded `products.json`
- Page 3 would load `margin_risk.json`

Each page had its own loading state, error handling, and data-cache boilerplate — duplicated code and no shared loading state.

### Solution: DataProvider + useData() Hook

Created a centralized `DataProvider` at the root layout level that loads all 3 datasets simultaneously via `Promise.all`:

```typescript
// src/contexts/data-context.tsx
useEffect(() => {
  let cancelled = false

  Promise.all([
    getOverviewData().catch((e) => { if (!cancelled) setError(e.message); return null }),
    getProductsData().catch(() => null),
    getMarginRiskData().catch(() => null),
  ]).then(([ov, pr, mr]) => {
    if (!cancelled) setState({ overview: ov, products: pr, marginRisk: mr })
  })

  return () => { cancelled = true }
}, [])
```

Pages then consume via `useData()`:

```typescript
const { overview, products, marginRisk, loading } = useData()
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `Promise.all` over sequential | All 3 datasets are independent — parallel fetch is faster |
| `cancelled` flag | Prevents setState after unmount (no "can't perform React state update" warning) |
| Per-fetch `.catch()` | One dataset failing doesn't block the others — partial data still renders |
| Shared `loading` | True only when ALL datasets are null; individual datasets can be partially loaded |

### Result

- One `useEffect` call instead of 3
- Shared loading state across pages
- Single error boundary point
- Pages are simpler — just consume context

---

## 12. Debounced Slider Pattern

### The Problem

The margin threshold slider fires `onValueChange` on every tick. Without debouncing, every tick triggers:
1. Re-filtering all SKUs by threshold
2. Re-computing scatter chart data (including sampling logic)
3. Re-rendering charts and table

At 30 possible slider positions, this is fine. But the slider emits values on `mousemove` — potentially dozens of events per second as the user drags.

### Solution: useDebounce Hook

```typescript
// src/hooks/use-debounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
```

In Page 3:

```typescript
const [threshold, setThreshold] = useState(10)
const debouncedThreshold = useDebounce(threshold, 120)

// Derived data only depends on debounced value
const atRiskSKUs = useMemo(() =>
  filteredSkus.filter(s => s.avg_margin_pct < debouncedThreshold),
  [filteredSkus, debouncedThreshold]
)
```

### How It Works

| Layer | Updates When | Purpose |
|-------|-------------|---------|
| `threshold` (raw state) | Every slider tick | Instant UI feedback (badge shows current value) |
| `debouncedThreshold` (derived) | 120ms after last change | Expensive filtering, chart rendering |

### Result

- Slider feels responsive (badge updates immediately)
- Chart data recomputes only after the user stops dragging for 120ms
- Avoids jank during fast slider drags

---

## 13. Scatter Chart Data Sampling for Large SKU Sets

### The Problem

The scatter chart (Volume vs Margin %) plots all 2,232 SKUs. Recharts ScatterChart with 2,000+ SVG elements causes:
- Slow initial render (2-3 seconds)
- Laggy tooltip hover
- Large DOM size (hundreds of KB)

### Solution: Smart Sampling with Top-K Preservation

```typescript
const MAX_POINTS = 500
const needsSampling = validData.length > MAX_POINTS

const sourceData = needsSampling
  ? (() => {
      const topSKUs = validData.slice(0, 200)        // Top 200 by revenue
      const remaining = validData.slice(200)
      const step = Math.ceil(remaining.length / (MAX_POINTS - 200))
      return [...topSKUs, ...remaining.filter((_, i) => i % step === 0)]
    })()
  : validData
```

### Strategy Rationale

| Group | Count | Why Preserve |
|-------|-------|-------------|
| Top 200 SKUs by revenue | 200 | High-revenue SKUs are the most important to see |
| Every nth remaining | ~300 | Representative sample of the long tail |
| **Total** | **~500** | Below Recharts perf threshold |

### Result

- Chart renders in < 200ms
- Tooltip works smoothly
- All high-value SKUs visible
- "Showing X of Y SKUs (sampled)" label prevents misinterpretation

---

## 14. Threshold-Driven Visual Styling (Not Data Filtering)

### The Pattern

The global filters (Month, Transaction Type, Product Type) use `useMemo` to **subset the data** — rows are included or excluded.

The threshold slider works differently: it controls **visual properties** (color, fill) based on threshold comparison, without removing any data points.

### Scatter: Dot Color

```typescript
for (const s of sourceData) {
  const point = { ...s, margin: s.avg_margin_pct }
  if (s.avg_margin_pct < threshold) {
    atRisk.push(point)   // Red dots
  } else {
    safe.push(point)     // Gray dots
  }
}

<Scatter data={safe} fill="#94a3b8" fillOpacity={0.4} />
<Scatter data={atRisk} fill="#ef4444" fillOpacity={0.6} />
```

### Histogram: Three-Tier Bar Coloring

```typescript
const fill = isBelow ? "#ef4444"        // Red — entirely below threshold
  : crossesThreshold ? "#f59e0b"        // Amber — crosses threshold
  : "#94a3b8"                           // Gray — above threshold
```

### Key Difference from Global Filters

| Aspect | Global Filters | Threshold Slider |
|--------|---------------|-----------------|
| What changes | Data rows passed to components | Visual properties (color, fill) |
| Data loss? | Yes — filtered rows excluded | No — all data visible |
| UX message | "Show me only X" | "Highlight SKUs below Y%" |
| Implementation | `useMemo` filtering | Color assignment in render |

This is important: the slider never hides data. The scatter always shows all SKUs, and the histogram always shows all 30 bins. Only the coloring changes.

---

## 15. Pagination with Smart Ellipsis

### The Problem

The at-risk SKU table can have 1 to 100+ pages (25 per page). Showing `[1][2][3]...[99][100]` with all intermediate numbers is:
- DOM-heavy (100+ button elements)
- Visually noisy
- Hard to navigate

### Solution: Smart Page Number Filtering

```typescript
Array.from({ length: totalPages }, (_, i) => i + 1)
  .filter((p) => {
    if (totalPages <= 7) return true           // Small dataset: show all
    if (p === 1 || p === totalPages) return true // Always show first + last
    if (Math.abs(p - page) <= 1) return true   // Neighbors of current
    return false
  })
  .reduce<(number | string)[]>((acc, p, i, arr) => {
    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...")
    acc.push(p)
    return acc
  }, [])
```

### Behavior by Page Count

| Total Pages | Example Display |
|-------------|----------------|
| 1–7 | `[1][2][3][4][5][6][7]` — all shown |
| 10, on page 4 | `[1]...[3][4][5]...[10]` — first, neighbors, last |
| 30, on page 1 | `[1][2]...[30]` — first + neighbor + last |

### Result

- Max 7 page buttons rendered regardless of total page count
- First + last pages always accessible
- Current page + neighbors visible for context
- Ellipsis reduces visual noise

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| In-memory cache over React Query | Simpler for static, session-scoped data. No need for caching, invalidation, or loading states beyond what we already had. |
| Skeleton UI pattern | Consistent with existing Page 1. Allows all UI elements (including collapsible sections) to be present and interactive from first render. |
| Route group pattern for shared layout | Clean separation between dashboard pages and utility pages (like `/_not-found`). Enables consistent sidebar across all dashboard routes. |
| Data context over per-page fetch | Centralizes loading state, error handling, and data availability. Avoids 3x `useEffect` duplication. Partial failure resilience via per-fetch `.catch()`. |
| Debounced threshold over raw state | Instant UI feedback (badge) + deferred expensive computation (chart data). 120ms matches perceptual "instant" threshold. |
| Scatter sampling over full render | Top 200 preserved (high-revenue SKUs), every nth from tail. < 200ms render vs 2-3s for full 2,232 points. |

---

## Related Documentation

- `implementation-plan.md` — Project task tracking
- `insights_log.md` — Business insights from data analysis
- `issues_log.md` — Data quality issues discovered during ETL
- `docs/bi-framework.md` — Business intelligence framework selection

---

## 16. QA Audit: setState Inside useMemo Causes Re-render Loops

### The Problem

```typescript
// at-risk-table.tsx — BUG
const filtered = useMemo(() => {
  setPage(1)  // ❌ State update during render
  if (!search) return skus
  return skus.filter(...)
}, [skus, search])
```

**Root Cause:** `useMemo` must be pure — no side effects. Calling `setPage(1)` inside a memoized computation triggers a state update during render, which causes React to re-render, which re-evaluates the `useMemo`, which calls `setPage(1)` again — infinite loop in React 18/19 Strict Mode.

### Solution

Move the side effect to `useEffect`:

```typescript
const filtered = useMemo(() => {
  if (!search) return skus
  return skus.filter(...)
}, [skus, search])

useEffect(() => {
  setPage(1)
}, [skus, search])
```

**Rule:** Never call `setState`, `dispatch`, or any side-effect function inside `useMemo`, `useCallback`, or the render body.

---

## 17. ETL Pipeline: Row-by-Row INSERT vs Batch Insert

### The Problem

```python
# transform.py — SLOW (30-60 minutes for 511K rows)
for row in rows_to_insert:
    cur.execute(insert_sql, row)
```

Each `cur.execute()` is one round-trip to the database. 511,559 rows = 511,559 network round-trips.

### Solution: psycopg2.extras.execute_values

```python
import psycopg2.extras

# FAST (< 30 seconds for 511K rows)
psycopg2.extras.execute_values(cur, insert_sql, rows_to_insert, page_size=10000)
```

`execute_values` uses PostgreSQL's `VALUES` syntax to batch rows into a single INSERT statement. `page_size=10000` means 10,000 rows per statement — 51 batches total instead of 511,559.

**Performance impact:** 30-60 minutes → < 30 seconds (100-200x faster).

---

## 18. ETL Pipeline: DROP TABLE vs TRUNCATE for Idempotent Loads

### The Problem

```sql
-- sql/02_create_star_schema.sql
DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS dim_transaction;
DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS dim_date;
```

Every time `load.py` runs, it executes this SQL file — destroying all previously loaded data. This makes the pipeline non-idempotent: you can't re-run it safely without losing data.

### Solution: Separate Migration from Data Load

```python
# load.py — new function
def truncate_fact_tables(conn):
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE fact_sales, dim_transaction, dim_product, dim_date RESTART IDENTITY;")
    conn.commit()
    cur.close()
```

Replace `create_schema_tables(conn)` with `truncate_fact_tables(conn)` in `load.py`. Schema creation (`DROP TABLE` + `CREATE TABLE`) becomes a one-time migration. Data loads use `TRUNCATE` which is faster and preserves table structure, indexes, and constraints.

**Best Practice:** Schema changes should be managed via migration tools (Flyway, Alembic, etc.), not embedded in data load scripts.

---

## 19. Filter Composition: Avoid Mutating Source Data

### The Problem

```typescript
// page.tsx — BUG: filters overwrite each other
if (transactionType === "outpatient") {
  monthly = monthly.map((m) => ({ ...m, revenue: m.revenue_outpatient ?? 0 }))
}
if (productType === "generic") {
  monthly = monthly.map((m) => ({ ...m, revenue: m.revenue_generic ?? 0 }))
  // ❌ Overwrites the outpatient revenue set above!
}
```

When both filters are active, the second filter overwrites the revenue set by the first. The user sees generic revenue, not generic + outpatient revenue.

### Solution: Compute Derived Revenue in a Single Pass

```typescript
const displayMonthly = monthly.map((m) => {
  let revenue = m.revenue
  if (transactionType === "outpatient") revenue = m.revenue_outpatient ?? 0
  else if (transactionType === "inpatient") revenue = m.revenue_inpatient ?? 0
  if (productType === "generic") revenue = m.revenue_generic ?? 0
  else if (productType === "branded") revenue = m.revenue_branded ?? 0
  return { ...m, revenue }
})
```

Single `map` pass, all filter logic in one place, no intermediate mutations.

---

## 20. Lazy Data Fetching: Hybrid Approach with React Context

### The Problem

The original `DataProvider` fetched ALL 3 JSON files (~946 KB) on EVERY page load, even though:
- Overview page only needs `overview.json` (1.7 KB)
- Products page only needs `products.json` (442 KB)
- Margin Risk page only needs `margin_risk.json` (503 KB)

This wasted 944 KB on the Overview page — a **556x bandwidth waste**.

### Solution: Lazy Fetching with Shared Cache

```typescript
// data-context.tsx — lazy fetch functions
const fetchOverview = useCallback(async () => {
  if (state.overview || fetching.overviewLoading) return
  setFetching(prev => ({ ...prev, overviewLoading: true }))
  try {
    const data = await getOverviewData()
    setState(prev => ({ ...prev, overview: data }))
  } catch (e) {
    setError(prev => prev ?? (e as Error).message)
  } finally {
    setFetching(prev => ({ ...prev, overviewLoading: false }))
  }
}, [state.overview, fetching.overviewLoading])
```

Each page triggers its own fetch in `useEffect`:

```typescript
// page.tsx (Overview)
const { overview, loading, fetchOverview } = useData()
useEffect(() => { fetchOverview() }, [fetchOverview])
```

**Key design decisions:**

| Decision | Rationale |
|----------|-----------|
| `fetchOverview` exposed via context | Pages trigger their own data load |
| Guard: `if (state.overview) return` | Prevents double-fetch on navigation back |
| Shared cache (in-memory + sessionStorage) | Cross-page navigation = instant (already cached) |
| Per-dataset loading state | Overview can show data while Products is still loading |

**Result:** Overview page downloads 1.7 KB instead of 946 KB on first visit. Cross-page navigation still instant via shared cache.

---

## 21. Dynamic Imports with next/dynamic

### The Problem

All chart components were statically imported, meaning the browser downloaded and parsed JavaScript for ALL charts on the first page visit — even charts only used on other pages.

### Solution

```typescript
import dynamic from "next/dynamic"

const MonthlyRevenueChart = dynamic(
  () => import("@/components/page1/monthly-revenue-chart").then(m => m.MonthlyRevenueChart),
  { loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-muted" /> }
)
```

**Impact on bundle size:**

| Route | Before | After | Change |
|-------|--------|-------|--------|
| `/` First Load JS | 259 kB | 143 kB | **-45%** |
| `/margin-risk` First Load JS | 264 kB | 147 kB | **-44%** |

**Tradeoff:** Dev server cold compile is ~1.6s slower (dynamic import overhead). Production is unaffected — chunks are pre-built.

**Best practice:** Always provide a `loading` fallback that matches the component's dimensions to avoid layout shift.

---

## 22. sessionStorage Cache Persistence

### The Problem

In-memory cache (`dataCache` object) is lost on page reload, causing all 3 JSON files to re-fetch.

### Solution

```typescript
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
```

Cache lookup order: in-memory → sessionStorage → network fetch.

**Why sessionStorage (not localStorage):** Data is scoped to the current tab/session. Closing the tab clears the cache — appropriate for analytics data that might be regenerated.

**Why not both:** In-memory is fastest (no serialization). sessionStorage is the fallback for page reloads. The TTL check ensures stale data is not served.

---

## 23. CSV Export: Proper Field Quoting

### The Problem

```typescript
// BUG: values with commas break CSV structure
const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
// If a field contains a comma: "SKU,Name",100,50 → breaks parsing
```

### Solution

```typescript
const csv = [headers, ...rows]
  .map(r => r.map(v => `"${v}"`).join(","))
  .join("\n")
```

Quote-wrap every value. This is the simplest correct CSV escaping. For production use, consider a proper CSV library (e.g., `papaparse`) that handles edge cases like embedded quotes and newlines.

---

## 24. Exception Handling: Uninitialized Variable in Error Handler

### The Problem

```python
# load.py — BUG
try:
    conn = psycopg2.connect(**DB_CONFIG)
    # ... do work
except Exception as e:
    update_lineage(conn, ...)  # ❌ conn was never assigned if connect() failed
```

If `psycopg2.connect()` raises an exception, `conn` is undefined. The `except` block references it, causing a `NameError` that swallows the original connection failure.

### Solution

```python
except Exception as e:
    if 'conn' in locals():
        try:
            update_lineage(conn, batch_id, 0, 0, 0, {"error": str(e)}, 'FAILED')
        except Exception:
            pass
```

Guard with `if 'conn' in locals()` to check if the variable was assigned before the exception.

---

## 25. `connectNulls=true` Creates False Continuity in Line Charts

### The Problem

```typescript
// monthly-trend-chart.tsx — MISLEADING
<Line connectNulls={true} dataKey="revenue" />
```

With only 5 months of data across 12 calendar months, `connectNulls` draws straight lines across 3-4 month gaps (Apr→Aug, skipping May-Jun-Jul). Users see a continuous trend that doesn't exist.

### Solution

Remove `connectNulls` (defaults to `false`). Gaps display as breaks in the line, which is the honest representation:

```typescript
<Line dataKey="revenue" />  // No connectNulls — gaps are visible
```

**Rule:** Never use `connectNulls` when data gaps represent missing data rather than zero values. A break in the line is more honest than a misleading straight connection.

---

## 26. Charts Must Respect Active Filter Scope

### The Problem

The SKU scatter chart and margin histogram always render all 12 months of SKU data regardless of the active month filter on Page 2. Users filtering to "January" still see the full-year scatter plot — the filter is silently ignored.

### Solution

Pipe the month filter into the data pipeline:

```typescript
// Option A: Filter at the aggregate level (preferred)
const filteredSkus = useMemo(() => {
  if (month === "all") return data.sku_scatter
  return data.sku_scatter.filter(s => s.year_month === month)
}, [data, month])

// Option B: Filter at the query level (ETL export)
// GROUP BY kd_obat, product_type, year_month
// WHERE d.year_month = :selected_month
```

**Rule:** Every filter on a page must affect every chart on that page. If a chart can't be filtered (e.g., histogram bins are pre-computed), document the limitation visibly.

---

## 27. Median Lines Must Match Displayed Data

### The Problem

```typescript
// scatter-chart.tsx — MISALIGNED
const medianX = data.reduce((sum, s) => sum + s.revenue, 0) / data.length  // Full 2,233 SKUs
// But chart only displays 500 sampled points
<ReferenceLine x={medianX} />  // Quadrant doesn't match visible points
```

The quadrant chart samples to 500 points but computes median lines from the full 2,233 SKU dataset. The visual quadrants don't match the visible points.

### Solution

Compute medians from the sampled (displayed) data:

```typescript
const sampledData = sampleData(data.sku_scatter, MAX_POINTS)
const medianX = sampledData.reduce((sum, s) => sum + s.revenue, 0) / sampledData.length
const medianY = sampledData.reduce((sum, s) => sum + (s.avg_margin_pct ?? 0), 0) / sampledData.length
```

**Rule:** Reference lines (medians, means, thresholds) must be computed from the same dataset that's being displayed. Mismatched reference lines create visual confusion.

---

## 28. KPI Delta Must Compare Same Cohort Over Time

### The Problem

```typescript
// page.tsx — MISLEADING
const prevMonth = useMemo(() => {
  const last = sorted[sorted.length - 1]
  const prev = sorted[sorted.length - 2]
  return {
    revenue: ((last.revenue - prev.revenue) / prev.revenue) * 100,
    // ❌ When a product-type filter is active, this compares
    //    different products across months, not the same cohort
  }
}, [filtered.monthly])
```

When a product-type or channel filter is active, the delta compares different products/channels across months rather than the same cohort over time.

### Solution

Compute period-over-period deltas after applying filters, ensuring the same cohort is compared:

```typescript
const prevMonth = useMemo(() => {
  if (!data || month !== "all") return null
  // Filter to same cohort as current display
  const cohortData = filtered.monthly.filter(m => m.year_month !== "all")
  if (cohortData.length < 2) return null
  const last = cohortData[cohortData.length - 1]
  const prev = cohortData[cohortData.length - 2]
  return {
    revenue: prev.revenue > 0
      ? ((last.revenue - prev.revenue) / prev.revenue) * 100
      : 0,
  }
}, [filtered.monthly, data, month])
```

**Rule:** Period-over-period comparisons must use the same filter cohort. A delta that mixes different products or channels is meaningless.

---

## 29. Silent Error Swallowing in DataProvider

### The Problem

```typescript
// data-context.tsx — NO ERROR FEEDBACK
const fetchProducts = useCallback(async () => {
  try {
    const data = await getProductsData()
    setState(prev => ({ ...prev, products: data }))
  } catch (e) {
    setError(prev => prev ?? (e as Error).message)  // Only sets error if none exists
  }
}, [...])
```

Errors in `getProductsData` and `getMarginRiskData` are caught but the `error` state is only set if `prev` is null (`prev ?? ...`). If overview already loaded successfully, product/margin errors are silently swallowed.

### Solution

Always surface errors, don't suppress them:

```typescript
catch (e: unknown) {
  const msg = (e as Error).message
  setError(prev => prev ? `${prev}; ${msg}` : msg)  // Append, don't suppress
}
```

**Rule:** Error state should accumulate, not suppress. Multiple errors can coexist — join them with semicolons or use an error array.

---

## 30. Missing Year Validation in NO_RESEP Parser

### The Problem

```python
# transform.py — ACCEPTS INVALID YEARS
def _valid_month(ym):
    parts = str(ym).split("-")
    m = int(parts[1])
    return 1 <= m <= 12  # ❌ Never checks the year!
```

A row like `RJ-01.9999-01-0001` passes as valid and appears in monthly charts under year 9999.

### Solution

Add year validation:

```python
def _valid_month(ym):
    try:
        parts = str(ym).split("-")
        year = int(parts[0])
        m = int(parts[1])
        return year == 2015 and 1 <= m <= 12  # Year guard added
    except (ValueError, IndexError):
        return False
```

**Rule:** Always validate all components of a parsed string, not just the parts you care about. Unvalidated components can introduce phantom data.

---

## 31. Division by Zero in KPI Delta Calculation

### The Problem

```typescript
// page.tsx — POSSIBLE INFINITY
const prevMonth = useMemo(() => {
  return {
    revenue: ((last.revenue - prev.revenue) / prev.revenue) * 100,
    // ❌ If prev.revenue === 0, this displays "Infinity%"
  }
}, [...])
```

### Solution

Add guard:

```typescript
revenue: prev.revenue > 0
  ? ((last.revenue - prev.revenue) / prev.revenue) * 100
  : 0,
```

**Rule:** Always guard division operations where the denominator can be zero. Display "N/A" or 0 instead of Infinity.

---

## Updated Decision Log

| Decision | Rationale |
|----------|-----------|
| Per-page loading states over single boolean | Prevents blank pages when navigating directly to a page whose data hasn't loaded yet. Each page shows its own skeletons. |
| Lazy data fetching over eager | 556x bandwidth reduction on Overview page (1.7 KB vs 946 KB). Cross-page caching preserved via shared context. |
| Dynamic imports for charts | 45% smaller JS bundles on Overview and Margin Risk pages. Dev compile penalty (~1.6s) is acceptable tradeoff. |
| sessionStorage for cache persistence | Survives page reload without re-fetching. Scoped to tab/session — appropriate for analytics data. |
| psycopg2.extras.execute_values over row-by-row | 100-200x faster ETL transform (30-60 min → < 30 sec). |
| TRUNCATE over DROP TABLE for data loads | Idempotent pipeline — re-running load.py doesn't destroy schema. Faster than DROP + CREATE. |
| Computed derived revenue in single pass | Prevents filter composition bugs where second filter overwrites first filter's result. |
| Single package manager lockfile | Mixing npm and pnpm lockfiles causes dependency resolution inconsistencies. |
| `.env` in `.gitignore` | Standard security practice — `.env` files often contain secrets. |
| Remove unused font imports | Each unused font adds ~50-200 KB to initial page load. |
| README as executive brief | Scenario-first, findings with citations, recommendations with confidence — mirrors proven portfolio project structure. |
| No `connectNulls` on line charts | Gaps in data are meaningful — a break in the line is more honest than a misleading connection. |
| Reference lines from displayed data | Median/mean lines must be computed from the same dataset being displayed, not the full source. |
| KPI delta uses same cohort | Period-over-period comparisons must apply the same filters to both periods. |
| Error state accumulates | Multiple errors can coexist — append with semicolons rather than suppressing subsequent errors. |
| Validate all parsed string components | Don't just validate the parts you use — unvalidated components can introduce phantom data. |
| Guard all division operations | Denominators can be zero — always check before dividing. |

---

## Updated Decision Log

| Decision | Rationale |
|----------|-----------|
| Lazy data fetching over eager | 556x bandwidth reduction on Overview page (1.7 KB vs 946 KB). Cross-page caching preserved via shared context. |
| Dynamic imports for charts | 45% smaller JS bundles on Overview and Margin Risk pages. Dev compile penalty (~1.6s) is acceptable tradeoff. |
| sessionStorage for cache persistence | Survives page reload without re-fetching. Scoped to tab/session — appropriate for analytics data. |
| psycopg2.extras.execute_values over row-by-row | 100-200x faster ETL transform (30-60 min → < 30 sec). |
| TRUNCATE over DROP TABLE for data loads | Idempotent pipeline — re-running load.py doesn't destroy schema. Faster than DROP + CREATE. |
| Computed derived revenue in single pass | Prevents filter composition bugs where second filter overwrites first filter's result. |