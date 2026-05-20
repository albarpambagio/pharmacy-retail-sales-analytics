# Implementation Plan — Pharmacy Retail Sales Analytics

## Project Meta

| Attribute | Value |
|-----------|-------|
| **Start Date** | 2026-05-18 |
| **Data First Accessed** | 2026-05-18 |
| **Data Source** | https://data.mendeley.com/datasets/2ym7v78wtd/1 |
| **Target Completion** | ~12 working days |
| **Status** | Phase 0-3b Complete, Phase 4 Partial (2/3 pages built) |

---

## Phase 0 — Setup

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Create folder structure | ✅ | `sql/`, `etl/`, `analysis/`, `logs/`, `dashboard/` created |
| 0.2 | Create PostgreSQL database `db_pharmacy` on port 5433 | ✅ | psql 18, password: admin |
| 0.3 | Create `sql/01_create_schema.sql` — staging table | ✅ | 4 staging tables (det_sales, ms_product, ms_sales, transaction) |
| 0.4 | Initialize Next.js from Shadboard starter-kit in `/dashboard` | ✅ | Next.js + Shadboard initialized, 3-page nav configured |
| 0.5 | Set up Python with `pyproject.toml` + `uv sync` | ✅ | uv 0.7.9, dependencies in pyproject.toml |
| 0.6 | Load `docs/data/temp/sales.sql` into staging | ✅ | det_sales_raw: 514,620 rows (QTY>0: 514,336) |
| 0.7 | Create `etl/config.py` for centralized configuration | ✅ | DB config, batch ID generation, log paths |

**Validation**: `SELECT COUNT(*) FROM staging.det_sales_raw;` → 514,620 (expected ~511,559, QTY>0: 514,336)

---

## Phase 1 — ETL Pipeline

### 1.1 Extract (`etl/extract.py`)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1.1 | Read raw data from `staging.det_sales_raw` | ✅ | psycopg2 → pandas DataFrame |
| 1.1.2 | Validate staging data | ✅ | 514,620 rows, 0 nulls, HJ range 0–24.5M |
| 1.1.3 | Log row count on completion | ✅ | `logs/extract.log` — 514,620 rows |

### 1.2 Transform (`etl/transform.py`)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.2.1 | Parse NO_RESEP with regex for standard format | ✅ | Regex + month validation (01–12 only) |
| 1.2.2 | Handle irregular NO_RESEP formats | ✅ | 475,574 irregular rows — extract txn+dept, year_month=NULL |
| 1.2.3 | Classify KD_OBAT: AI-* → Generic, R-* → Branded | ✅ | Generic: 378,359 / Branded: 136,261 / Other: 0 |
| 1.2.4 | Calculate revenue = QTY × HJ | ✅ | |
| 1.2.5 | Calculate gross_margin = HJ − HNA | ✅ | |
| 1.2.6 | Calculate margin_pct = ((HJ − HNA) / HNA) × 100 | ✅ | Guard HNA=0 → NULL |
| 1.2.7 | Derive tax_inclusive from PPN_JUAL | ✅ | 1 if PPN_JUAL=10, else 0 |
| 1.2.8 | Assign price tier by HJ ranges | ✅ | Low 203K / Mid 236K / High 62K / Premium 12K |
| 1.2.9 | Flag data quality issues | ✅ | HJ<HNA: 1,347 / QTY≤0: 284 / unrecognised: 0 |

### 1.3 Load (`etl/load.py` + `sql/02_create_star_schema.sql`)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.3.1 | Create `sql/02_create_star_schema.sql` | ✅ | dim_transaction, dim_product, dim_date, fact_sales |
| 1.3.2 | Populate dim_date (12 months of 2015) | ✅ | 12 rows (Jan–Dec) |
| 1.3.3 | Populate dim_transaction from parsed NO_RESEP | ✅ | 157,704 rows |
| 1.3.4 | Populate dim_product from classified KD_OBAT | ✅ | 2,233 rows |
| 1.3.5 | Populate fact_sales with FKs and calculated metrics | ✅ | 514,336 rows (excludes QTY≤0) |

### 1.4 Export (`etl/export_json.py`)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.4.1 | Query and export `overview.json` | ✅ | 5 monthly periods (Jan, Mar, Apr, Aug, Sep) |
| 1.4.2 | Query and export `products.json` | ✅ | Prod type rev, monthly trend, SKU scatter (2,233 SKUs), top 20 |
| 1.4.3 | Query and export `margin_risk.json` | ✅ | All SKUs with margin data, 30-bin histogram |
| 1.4.4 | Pre-compute filter aggregates | ⬜ | Will add during Phase 4 if needed |

### 1.5 Validation
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.5.1 | Row count: fact_sales vs staging (minus QTY ≤ 0) | ✅ | 514,336 = 514,336 ✅ |
| 1.5.2 | FK integrity: no orphaned fact rows | ✅ | 0 orphaned in all 3 FK checks |
| 1.5.3 | Monthly distribution: no missing months | ✅ | 12/12 months in dim_date; data in 5 months |
| 1.5.4 | Revenue total non-zero and reasonable | ✅ | ~19.05B IDR |
| 1.5.5 | Issues log updated with flagged counts | ✅ | `docs/issues_log.md` created |
| 1.5.6 | Data traceability: batch ID tracking | ✅ | fact_sales.etl_batch_id, staging.etl_batch_id |
| 1.5.7 | Data traceability: lineage table | ✅ | etl.lineage tracks batch status, row counts |

---

## Phase 2 — EDA (SCAN Framework)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Monthly revenue total (Jan–Dec) | ✅ | Only 5/12 months have valid dates (92.4% rows undated) |
| 2.2 | Monthly transaction count | ✅ | 38,953 dated txns vs 157,677 total |
| 2.3 | Revenue by transaction type (RJ vs RI) | ✅ | Outpatient 63.8%, Inpatient 28.7%, Unknown 7.5% |
| 2.4 | Revenue by product type (generic vs branded) | ✅ | Generic 70.3%, Branded 29.7% — margins ~35% both |
| 2.5 | Top 20 SKUs by revenue | ✅ | 35.6% revenue concentration, 18/20 generic |
| 2.6 | Margin % distribution (histogram) | ✅ | 23 SKUs (1%) below 10% — low systemic risk |
| 2.7 | Price tier distribution | ✅ | Premium 40.8% revenue, Mid 45% transaction volume |
| 2.8 | Create marimo notebook `analysis/eda_notebook.py` with 8 inline charts + explanations | ✅ | 11 cells, reactive Plotly charts via `mo.as_html()` |
| 2.9 | Export 8 CSV summaries → `analysis/summaries/*.csv` | ✅ | Same data as charts, spreadsheet-ready |
| 2.10 | Document 7 findings in insights log | ✅ | 5 actionable, 7 total mapped to stakeholders |
| 2.11 | SCAN Framework C — Columns and Coverage | ✅ | `docs/scan-columns-coverage.md` documents dataset limitations |

**Marimo Notebook** (`analysis/eda_notebook.py`): view via `uv run marimo edit analysis/eda_notebook.py`
- 11 cells: intro + global summary + 8 chart sections + findings table
- Each chart cell: SQL query → Plotly figure → `mo.md(...)` wrapping explanation + `mo.as_html(fig)`
- Reactive: data flows between cells automatically (marimo dependency graph)
- Also runnable headlessly: `python analysis/eda_notebook.py`

**Generated CSVs** (`analysis/summaries/`): `monthly_revenue.csv`, `revenue_by_txn_type.csv`, `revenue_by_product_type.csv`, `monthly_product_trend.csv`, `top20_skus.csv`, `margin_distribution.csv`, `price_tier_distribution.csv`, `sku_performance.csv`

---

## Key EDA Findings (Top 3)

1. **Generics dominate**: 70.3% of revenue, 18/20 top SKUs, with near-identical margins to branded (~35%)
2. **Data gap limits monthly analysis**: 92.4% of rows have no valid date — only 5 months chartable
3. **Margin risk is low**: Only 23 SKUs (1%) below 10% threshold, representing 0.2% of revenue

## Phase 3 — Deep Dive (North Star Method)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Q1: Monthly revenue trend + mix shift analysis | ✅ | 9 rows exported to monthly_revenue_trend.csv |
| 3.2 | Q1: Decompose revenue = txn count × avg revenue/txn | ✅ | 9 rows exported to revenue_decomposition.csv |
| 3.3 | Q2: Margin % by SKU, rank by revenue volume | ✅ | 2,230 rows exported to margin_by_sku.csv |
| 3.4 | Q2: Cross-check risk SKUs: generic/branded, RJ/RI | ✅ | 887 rows exported to risk_skus_crosscheck.csv |
| 3.5 | Q3: 2×2 cross-tab: product type × transaction type | ✅ | 6 cells exported to product_transaction_crosstab.csv |
| 3.6 | Q3: Monthly stability check of mix | ✅ | 18 rows exported to monthly_stability.csv |
| 3.7 | Document quantified findings with recommendations | ✅ | 4 new findings added to insights_log.md |
| 3.8 | CSV export verification | ✅ | verify_export() checks columns, row counts, NULLs |

---

## Phase 3b — Marimo Notebook Update (Deep Dive Extension) ✅ COMPLETE

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3b.1 | Add revenue decomposition chart (txn count × avg revenue/txn) | ✅ | Dual-axis bar+line from `revenue_decomposition.csv` — Cell 09 |
| 3b.2 | Add margin risk cross-check scatter (generic/branded × RJ/RI) | ✅ | Scatter with risk zones from `risk_skus_crosscheck.csv` — Cell 10 |
| 3b.3 | Add product×transaction crosstab heatmap | ✅ | 2×3 revenue heatmap + margin labels from `product_transaction_crosstab.csv` — Cell 11 |
| 3b.4 | Add monthly stability line chart (generic vs branded % over months) | ✅ | Dual line from `monthly_stability.csv` — Cell 12 |
| 3b.5 | Update findings panel with Phase 3 quantified recommendations | ✅ | 11 findings total (7 Phase 2 + 4 Phase 3) |

---

## Phase 4 — Dashboard (Shadboard + Next.js)

### Page 1 — Executive Overview ✅ COMPLETE
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1.1 | Navigation bar with active page indicator | ✅ | Shadboard built-in sidebar, active state via `usePathname()` |
| 4.1.2 | Page header: H1 + subtitle | ✅ | "Executive Overview" + "Hospital Pharmacy Performance · Full Year 2015" |
| 4.1.3 | Global filters (Month, Txn Type, Product Type) | ✅ | All 3 filters wired — Month, Txn Type, AND Product Type all functional via `useMemo` |
| 4.1.4 | KPI cards: Total Revenue, Transactions, Avg Margin % | ✅ | MoM deltas via prev month comparison, skeleton loading |
| 4.1.5 | Monthly revenue line chart (Recharts) | ✅ | IDR formatted Y-axis, custom tooltip |
| 4.1.6 | Revenue mix area chart (100% stacked) | ✅ | Outpatient vs Inpatient % split |
| 4.1.7 | Monthly performance summary table | ✅ | Sortable (click headers), conditional formatting, TOTAL footer row |
| 4.1.8 | Mobile responsive layout | ✅ | Tailwind `md:grid-cols-{2,3}` breakpoints, stacked on mobile |
| 4.1.9 | **Interpretation Guide section** | ✅ | `InterpretationGuide` component present |

### Page 2 — Product Performance ✅ COMPLETE
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.2.1 | KPI cards: Total Revenue, Total SKUs | ✅ | Shows aggregate revenue + SKU count |
| 4.2.2 | Bar chart: Generic vs Branded revenue | ✅ | `RevenueBarChart` component |
| 4.2.3 | Line chart: Monthly trend by product type | ✅ | `MonthlyTrendChart` component |
| 4.2.4 | Scatter chart: Revenue vs Margin % (SKU quadrant) | ✅ | `SKUQuadrantChart` component, median lines, 4 quadrant labels |
| 4.2.5 | Top 20 SKUs table (TanStack) | ✅ | `Top20Table` component, search, export CSV, sortable |
| 4.2.6 | Mobile responsive layout | ✅ | Horizontal bars, paginated table |
| 4.2.7 | **Explanation section (interpretation guide)** | ✅ | `InterpretationGuide` component present |
| 4.2.8 | Global filters wired | ✅ | Month, Txn Type, Product Type all filter data via `useMemo` |

### Page 3 — Margin Risk ✅ COMPLETE
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.3.1 | Create `/margin-risk` page route | ✅ | `margin-risk/page.tsx` — full page component |
| 4.3.2 | Global filters + margin threshold slider | ✅ | Product Type filter + 0–30% slider (default 10%), debounced at 120ms |
| 4.3.3 | Risk KPI cards: At-Risk SKUs, Revenue at Risk, Avg Margin % | ✅ | Red accent, `RiskKPICards` component |
| 4.3.4 | Scatter: Volume vs Margin % (red/gray dots) | ✅ | Smart sampling (max 500 pts), threshold reference line, `React.memo` |
| 4.3.5 | Histogram: SKU margin % distribution | ✅ | 30-bin, 3-tier coloring (red/amber/gray) by threshold |
| 4.3.6 | At-risk SKU detail table | ✅ | Sortable, searchable, paginated with smart ellipsis, CSV export |
| 4.3.7 | Live update: slider → all components react | ✅ | Client-side via `useDebounce`, no re-fetch needed |
| 4.3.8 | Mobile responsive layout | ✅ | Tailwind breakpoints, stacked on mobile |
| 4.3.9 | **Explanation section (interpretation guide)** | ✅ | Collapsible card, 6 items — Margin Threshold, At-Risk SKU Definition, Scatter Plot, Histogram, Gross Margin Formula, Risk Interpretation |

### Deployment
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.4.1 | Configure `next.config.mjs` for static export | ✅ | `output: 'export'`, `images.unoptimized: true` |
| 4.4.2 | Build: `npm run build` | ✅ | Production + static export builds pass |
| 4.4.3 | Create `.env` with `BASE_URL` | ✅ | `.env` from `.env.example` |
| 4.4.4 | Deploy to Cloudflare Pages | ⬜ | Connect GitHub repo |
| 4.4.5 | Verify live URL on mobile | ⬜ | |

---

## Phase 5 — Write-up

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | README: Business scenario + exec-driven questions | ⬜ | 2–3 sentences |
| 5.2 | README: Pipeline architecture flowchart | ⬜ | Mermaid diagram |
| 5.3 | README: Key findings (3–5 quantified bullets) | ⬜ | |
| 5.4 | README: Dashboard preview screenshot | ⬜ | |
| 5.5 | README: Recommendations mapped to stakeholders | ⬜ | |
| 5.6 | README: Data limitations | ⬜ | Pre-empt interview questions |
| 5.7 | README: Reproduction instructions | ⬜ | Setup commands |
| 5.8 | README: Lessons learned | ⬜ | Honest reflection |

---

## Blockers & Notes

| Date | Blocker | Resolution |
|------|---------|------------|
| | | |

---

## Validation Checklist

- [x] SQL scripts run without errors
- [x] Row counts reconcile with source data (~511,559)
- [x] All 3 dashboard pages functional with filters
- [x] Page 3 threshold slider works with live updates
- [x] Mobile responsive on all pages
- [ ] Cloudflare Pages deployment successful
- [ ] README complete with live URL

---

## Summary of What's Been Implemented

**Completed (Phases 0-4):**
- Full ETL pipeline: extract → transform → load → export (514,336 fact rows)
- Star schema: dim_date (12), dim_transaction (157,704), dim_product (2,233), fact_sales (514,336)
- 3 static JSON exports: overview.json, products.json, margin_risk.json
- EDA notebook (Marimo) with 12 reactive charts + 11 findings (Phase 2 + Phase 3b)
- Deep dive analysis with 6 CSV exports + 4 quantified findings
- Dashboard Page 1 (Executive Overview) — fully functional with 3 filters, KPIs, charts, table
- Dashboard Page 2 (Product Performance) — fully functional with filters, bar chart, trend line, scatter quadrant, top-20 table
- Dashboard Page 3 (Margin Risk) — fully functional with debounced threshold slider, scatter (smart sampling), 3-tier histogram, sortable table with CSV export, interpretation guide
- Data Context Provider — centralized data loading via `Promise.all` with cancellation
- Next.js static export config + build passing

**Not Started:**
- Phase 5: README/write-up
- Cloudflare Pages deployment
