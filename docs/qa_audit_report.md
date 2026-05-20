# QA Audit Report — Pharmacy Retail Sales Analytics

**Author:** opencode (AI Agent)  
**Date:** May 20, 2026  
**Scope:** Full-stack — ETL Pipeline (Python), SQL Star Schema, Next.js Dashboard (3 pages), Analysis Scripts  
**Version:** Pipeline v1.0 / Dashboard v3.0  

---

## Executive Summary

Full-stack QA audit identified **21 issues** across the codebase: **3 CRITICAL** (crashes or masked errors), **7 HIGH** (data integrity broken or UX significantly impaired), **7 MEDIUM**, **4 LOW**.

| Severity | Count | Areas Hit |
|----------|-------|-----------|
| 🔴 **Critical** | 3 | React hook violation, uninitialized variable in error handler, filter data corruption |
| 🟠 **High** | 7 | Missing months, 511K row-by-row insert, destructive DROP TABLE, misleading connectNulls, per-page loading, chart filter gaps, median line mismatch |
| 🟡 **Medium** | 7 | KPI delta logic, silent error swallowing, stale title, year validation, duplicate imports, division by zero, CSV escaping |
| 🔵 **Low** | 4 | Unused fonts, stale cache, CSS compat, hover states |

---

## 🔴 Critical Issues

### C1 — `setState` Side Effect Inside `useMemo`
**File:** `dashboard/src/components/page3/at-risk-table.tsx:39`  
**Severity:** 🔴 Runtime crash risk  
**Description:** `setPage(1)` is called inside a `useMemo` callback. React hooks must be pure — state updates during render are forbidden. In React 18/19 Strict Mode this double-invokes and can cause infinite re-render loops.  
**Fix:** Move to `useEffect` watching `[skus, search]`, or call `setPage(1)` inside the search `onChange` handler.

### C2 — Uninitialized `conn` Referenced in Error Handler
**File:** `etl/load.py:182`  
**Severity:** 🔴 Exception masking  
**Description:** If `psycopg2.connect()` fails, the `except` block calls `update_lineage(conn, ...)` where `conn` was never assigned. This raises `NameError`, swallowing the original connection failure.  
**Fix:** Guard with `if 'conn' in locals()` or nest the lineage update in a second try/except.

### C3 — Filter Chain Mutates Revenue Field
**File:** `dashboard/src/app/(dashboard-layout)/page.tsx:38-63`  
**Severity:** 🔴 Data corruption on filter toggle  
**Description:** When a user selects "Outpatient" (or Generic), the code overwrites `m.revenue` with the outpatient-only value. Deselecting the filter returns the already-mutated data — original totals are lost forever. Both the transaction-type and product-type filters have this bug.  
**Fix:** Keep the source `data.monthly` immutable. Compute display revenue in a separate derived value tagged by active filters. The `RevenueMixChart` should always read from original `revenue_outpatient`/`revenue_inpatient` fields, not the mutated `revenue`.

---

## 🟠 High Issues

### H1 — MONTHS Array Missing 7 of 12 Months
**File:** `dashboard/src/lib/data.ts:32-39`  
**Severity:** 🟠 Broken filter  
**Description:** Only Jan, Mar, Apr, Aug, Sep are listed. Feb, May, Jun, Jul, Oct, Nov, Dec absent from dropdown. Users cannot filter by these months even if future data loads them.  
**Fix:** Add all 12 entries: `2015-02` through `2015-12`.

### H2 — MonthlyTrendChart Labels Incomplete
**File:** `dashboard/src/components/page2/monthly-trend-chart.tsx:23-29`  
**Severity:** 🟠 Broken axis labels  
**Description:** Same gap — only 5 months mapped. New months on the x-axis render raw keys (`2015-06`) instead of friendly labels ("Jun").  
**Fix:** Include all 12 month keys.

### H3 — Row-by-Row INSERT of 511K Records
**File:** `etl/transform.py:217-218`  
**Severity:** 🟠 Performance (30-60 min runtime)  
**Description:** Each row is inserted via individual `cur.execute()` — one round-trip per row.  
**Fix:** Replace with `psycopg2.extras.execute_values()` or `copy_from()` for bulk load. Target: <30 seconds.

### H4 — Load Destroys Star Schema on Every Run
**File:** `sql/02_create_star_schema.sql:1-4` + `etl/load.py:146`  
**Severity:** 🟠 Non-idempotent pipeline  
**Description:** `create_schema_tables()` executes the SQL file which contains `DROP TABLE IF EXISTS fact_sales` etc. Re-running wipes all previously loaded data.  
**Fix:** Separate schema creation (one-time migration) from data load. Use `TRUNCATE` or upsert instead of DROP.

### H5 — `connectNulls=true` Creates False Continuity
**File:** `dashboard/src/components/page2/monthly-trend-chart.tsx:73, 82`  
**Severity:** 🟠 Visual misrepresentation  
**Description:** With only 5 months of data across 12 calendar months, `connectNulls` draws straight lines across 3-4 month gaps (Apr→Aug, skipping May-Jun-Jul). Users see a continuous trend that doesn't exist.  
**Fix:** Remove the `connectNulls` prop (defaults to `false`). Gaps display as breaks in the line.

### H6 — SKUQuadrantChart & Histogram Ignore Month Filter
**Files:** `dashboard/src/components/page2/scatter-chart.tsx`, `dashboard/src/components/page3/margin-histogram.tsx`  
**Severity:** 🟠 Inconsistent filtering  
**Description:** The scatter chart and histogram always render all 12 months of SKU data regardless of the active month filter on Page 2. Users filtering to "January" still see the full-year scatter plot.  
**Fix:** Pipe month filter into SKU aggregate queries or apply client-side filtering.

### H7 — Median Lines Computed on Full Dataset but Displayed on Sampled Data
**File:** `dashboard/src/components/page2/scatter-chart.tsx:56-63`  
**Severity:** 🟠 Misaligned chart references  
**Description:** The quadrant chart samples to 500 points but computes median lines from the full 2,233 SKU dataset. The visual quadrants don't match the visible points.  
**Fix:** Compute medians from the sampled (displayed) data.

---

## 🟡 Medium Issues

### M1 — KPI Delta Compares Wrong Time Periods
**File:** `dashboard/src/app/(dashboard-layout)/page.tsx:76-97`  
**Severity:** 🟡 Misleading metrics  
**Description:** `prevMonth` delta compares the last two months of the **filtered** data. When a product-type or channel filter is active, this compares different products/channels across months rather than the same cohort over time.  
**Fix:** Compute period-over-period deltas after applying filters, ensuring the same cohort is compared month-to-month.

### M2 — Silent Error Swallowing in DataProvider
**File:** `dashboard/src/contexts/data-context.tsx:49-50`  
**Severity:** 🟡 No error feedback  
**Description:** `getProductsData` and `getMarginRiskData` errors are caught with `.catch(() => null)` — no error state set, no UI indicator. Users see blank pages without knowing why.  
**Fix:** Surface errors for all three endpoints, not just overview.

### M3 — Dashboard Title Shows "Shadboard"
**File:** `dashboard/src/app/layout.tsx:21`  
**Severity:** 🟡 Branding  
**Description:** `<title>` reads "Shadboard" (starter template default). Browser tabs and bookmarks show the wrong name.  
**Fix:** Update to "Pharmacy Retail Analytics".

### M4 — Missing Year Validation in NO_RESEP Parser
**File:** `etl/transform.py:25-32`  
**Severity:** 🟡 Invalid data accepted  
**Description:** `_valid_month()` checks month 1-12 but never validates the year. A row like `RJ-01.9999-01-0001` passes as valid and appears in monthly charts under year 9999.  
**Fix:** Add `int(parts[0]) == 2015` check (or extract year from data).

### M5 — Duplicate `import sys`
**File:** `analysis/deep_dive.py:21-22`  
**Severity:** 🟡 Code quality  
**Description:** `import sys` appears on two consecutive lines. Unused duplicate.  
**Fix:** Remove line 21 or 22.

### M6 — prevMonth Division by Zero Risk
**File:** `dashboard/src/app/(dashboard-layout)/page.tsx:86-92`  
**Severity:** 🟡 Possible Infinity display  
**Description:** `prev.revenue > 0` is not checked before `(last.revenue - prev.revenue) / prev.revenue`. If `prev.revenue === 0`, the KPI delta displays "Infinity%".  
**Fix:** Add `prev.revenue > 0` guard.

### M7 — CSV Export Missing Field Quoting
**Files:** `dashboard/src/components/page3/at-risk-table.tsx:75-101`, `dashboard/src/components/page2/top-20-table.tsx:64-88`  
**Severity:** 🟡 Malformed CSV  
**Description:** Row values are joined with commas without quoting or escaping. A field containing a comma breaks the CSV structure.  
**Fix:** Quote-wrap all values or use a CSV utility.

---

## 🔵 Low Issues

### L1 — Lato/Cairo Fonts Loaded but Not Applied
**Files:** `dashboard/src/app/globals.css:20-24`, `dashboard/src/app/layout.tsx:29-41`  
**Severity:** 🔵 Wasted network requests  
**Description:** Two web font families downloaded but dashboard content renders in browser default sans-serif. `--font-lato` and `--font-cairo` variables exist but are never assigned to a selector used by dashboard content.  
**Fix:** Apply font variables to `body` in globals.css or remove unused font loading.

### L2 — In-Memory Cache Never Invalidates
**File:** `dashboard/src/lib/data.ts:1`  
**Severity:** 🔵 Stale data during development  
**Description:** `dataCache` persists across navigations with no expiry or rebuild trigger. Regenerated JSON files during a session won't be picked up.  
**Fix:** Add cache-busting query param (`?t=${Date.now()}`) during development, or set a short TTL.

### L3 — CSS Opacity Syntax Compatibility
**File:** `dashboard/src/app/globals.css:167`  
**Severity:** 🔵 Potential browser inconsistency  
**Description:** `outline-ring/50` uses Tailwind v4 opacity modifier syntax on a CSS custom property. Some contexts may not resolve the `/50` correctly.  
**Fix:** Verify against deployed build output; fall back to `opacity-50` utility if needed.

### L4 — Inconsistent Hover States on Interactive Elements
**Files:** Various dashboard components  
**Severity:** 🔵 UX polish  
**Description:** Table headers (sortable), chart legends, and pagination buttons lack hover feedback. Non-interactive elements inconsistently show pointer cursors.  
**Fix:** Add `hover:bg-muted`, `hover:text-foreground`, and cursor utilities consistently across all interactive elements.

---

## Dashboard Performance Profile

### Implemented Optimizations ✅

| Optimization | Mechanism | Effect |
|-------------|-----------|--------|
| Threshold debounce | 120ms debounce on slider | Prevents 30+ re-renders/sec during drag |
| React.memo on charts | All chart/pure display components wrapped | Skips re-render when props unchanged |
| Pagination (AtRiskTable) | 25 items/page | DOM nodes reduced ~75% from full list |
| Data sampling (scatter) | Max 500 points via stratified sampling | 78% fewer SVG elements (2,233 → 500) |
| Separated useMemo calls | Independent memoization per derived value | No cascading recomputation |
| Context batching | DataProvider batches all 3 JSON fetches | Single state update, not 3 cascading |

### Benchmarks (estimated)

| Metric | Before | After |
|--------|--------|-------|
| Scatter chart DOM nodes | ~2,233 `<circle>` | ~500 `<circle>` |
| Threshold slider re-render rate | ~30 fps during drag | Debounced to 1 update/120ms |
| At-risk table DOM nodes | Full 2,000+ rows | 25 rows + pagination |
| Context updates on load | 3 cascading renders | 1 batched render |

### Data Footprint

| JSON File | Size | Contents |
|-----------|------|----------|
| `overview.json` | ~1.7 KB | 5 monthly periods with aggregates |
| `products.json` | ~470 KB | 2,233 SKU scatter points, top 20, trends |
| `margin_risk.json` | ~535 KB | 2,233 SKU margin records, 30-bin histogram |

---

## Remediation Roadmap

### Week 1 — Critical & High
| Order | ID | Effort | Area |
|-------|----|--------|------|
| 1 | C1 | 15 min | Move `setPage` to `useEffect` |
| 2 | C3 | 30 min | Immutable filter refactor |
| 3 | H1 | 5 min | Add missing months |
| 4 | H5 | 2 min | Remove `connectNulls` |
| 5 | H6 | 1 hr | Pipe month filter into SKU queries |
| 6 | H7 | 30 min | Median from sampled data |
| 7 | C2 | 15 min | Guard conn in exception handler |

### Week 2 — High & Medium
| Order | ID | Effort | Area |
|-------|----|--------|------|
| 8 | H3 | 2 hr | Batch insert in transform.py |
| 9 | H4 | 1 hr | Separate migration from load |
| 10 | M1 | 1 hr | Fix KPI delta cohort comparison |
| 11 | H2 | 5 min | Add remaining month labels |
| 12 | M2 | 15 min | Surface all fetch errors |
| 13 | M3 | 2 min | Update page title |
| 14 | M4 | 5 min | Add year validation |
| 15 | M5 | 1 min | Remove duplicate import |
| 16 | M6 | 5 min | Add division guard |
| 17 | M7 | 15 min | Quote values in CSV export |

### Month 1 — Low & Infrastructure
| Order | ID | Effort | Area |
|-------|----|--------|------|
| 18 | L1 | 15 min | Apply or remove fonts |
| 19 | L2 | 30 min | Cache invalidation strategy |
| 20 | L3 | 15 min | Verify CSS compatibility |
| 21 | L4 | 1 hr | Consistent hover states |
| — | — | 3 days | Add pytest for ETL transforms |
| — | — | 3 days | Add Vitest + RTL for dashboard components |

---

## Summary of Audit Coverage

| Layer | Files | Lines | Issues |
|-------|-------|-------|--------|
| ETL pipeline | 6 Python | 1,099 | 3 (C2, H3, M4) |
| SQL schemas | 2 files | 106 | 1 (H4) |
| Dashboard — pages | 3 pages | 490 | 4 (C3, H6, M1, M6) |
| Dashboard — components | 15 components | 2,024 | 6 (C1, H2, H5, H7, M7, L4) |
| Dashboard — data/context | 3 files | 230 | 4 (H1, M2, M3, L2) |
| Dashboard — styling | 1 file | 267 | 2 (L1, L3) |
| Analysis scripts | 2 Python | 870 | 1 (M5) |
| **Total** | **32 files** | **~5,086** | **21 issues** |

---

**Status:** Draft — findings ready for triage  
**Next Review:** After Week 1 remediation  
**Author:** opencode (AI Agent)
