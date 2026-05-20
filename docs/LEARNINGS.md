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

## Decision Log

| Decision | Rationale |
|----------|-----------|
| In-memory cache over React Query | Simpler for static, session-scoped data. No need for caching, invalidation, or loading states beyond what we already had. |
| Skeleton UI pattern | Consistent with existing Page 1. Allows all UI elements (including collapsible sections) to be present and interactive from first render. |
| Route group pattern for shared layout | Clean separation between dashboard pages and utility pages (like `/_not-found`). Enables consistent sidebar across all dashboard routes. |

---

## Related Documentation

- `implementation-plan.md` — Project task tracking
- `insights_log.md` — Business insights from data analysis
- `issues_log.md` — Data quality issues discovered during ETL
- `docs/bi-framework.md` — Business intelligence framework selection