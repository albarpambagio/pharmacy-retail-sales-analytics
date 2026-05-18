# Implementation Plan — Pharmacy Retail Sales Analytics

## Project Meta

| Attribute | Value |
|-----------|-------|
| **Start Date** | 2026-05-18 |
| **Target Completion** | ~12 working days |
| **Status** | Phase 1 Complete |

---

## Phase 0 — Setup

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Create folder structure | ✅ | `sql/`, `etl/`, `analysis/`, `logs/` created |
| 0.2 | Create PostgreSQL database `db_pharmacy` on port 5433 | ✅ | psql 18, password: admin |
| 0.3 | Create `sql/01_create_schema.sql` — staging table | ✅ | 4 staging tables (det_sales, ms_product, ms_sales, transaction) |
| 0.4 | Initialize Next.js from Shadboard starter-kit in `/dashboard` | ➡️ | Deferred to Phase 4 |
| 0.5 | Set up Python venv + `requirements.txt` | ✅ | uv 0.7.9, installed psycopg2-binary, pandas |
| 0.6 | Load `docs/data/temp/sales.sql` into staging | ✅ | det_sales_raw: 514,620 rows (QTY>0: 514,336) |

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
| 1.4.1 | Query and export `overview.json` | ✅ | 4 monthly periods (Jan, Mar, Apr, Aug, Sep) |
| 1.4.2 | Query and export `products.json` | ✅ | Prod type rev, monthly trend, SKU scatter, top 20 |
| 1.4.3 | Query and export `margin_risk.json` | ✅ | All SKUs with margin data, 30-bin histogram |
| 1.4.4 | Pre-compute filter aggregates | ➡️ | Will add during Phase 4 if needed |

### 1.5 Validation
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.5.1 | Row count: fact_sales vs staging (minus QTY ≤ 0) | ✅ | 514,336 = 514,336 ✅ |
| 1.5.2 | FK integrity: no orphaned fact rows | ✅ | 0 orphaned in all 3 FK checks |
| 1.5.3 | Monthly distribution: no missing months | ✅ | 12/12 months in dim_date; data in 5 months |
| 1.5.4 | Revenue total non-zero and reasonable | ✅ | ~19.05B IDR |
| 1.5.5 | Issues log updated with flagged counts | ✅ | Logs written to `logs/` |

---

## Phase 2 — EDA (SCAN Framework)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Monthly revenue total (Jan–Dec) | ⬜ | Check seasonality |
| 2.2 | Monthly transaction count | ⬜ | Volume vs value trends |
| 2.3 | Revenue by transaction type (RJ vs RI) | ⬜ | Channel split |
| 2.4 | Revenue by product type (generic vs branded) | ⬜ | Product split |
| 2.5 | Top 20 SKUs by revenue | ⬜ | Concentration check |
| 2.6 | Margin % distribution (histogram) | ⬜ | Compression cluster |
| 2.7 | Price tier distribution | ⬜ | SKU mix |
| 2.8 | Document 5+ findings in insights log | ⬜ | Metric, dimension, finding, stakeholder |

---

## Phase 3 — Deep Dive (North Star Method)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Q1: Monthly revenue trend + mix shift analysis | ⬜ | Revenue by channel over time |
| 3.2 | Q1: Decompose revenue = txn count × avg revenue/txn | ⬜ | Volume vs value driver |
| 3.3 | Q2: Margin % by SKU, rank by revenue volume | ⬜ | Identify compression risk SKUs |
| 3.4 | Q2: Cross-check risk SKUs: generic/branded, RJ/RI | ⬜ | |
| 3.5 | Q3: 2×2 cross-tab: product type × transaction type | ⬜ | Revenue, txn count, avg margin % |
| 3.6 | Q3: Monthly stability check of mix | ⬜ | |
| 3.7 | Document quantified findings with recommendations | ⬜ | Include confidence levels |

---

## Phase 4 — Dashboard (Shadboard + Next.js)

### Page 1 — Executive Overview
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1.1 | Navigation bar with active page indicator | ⬜ | Text-only, no icons |
| 4.1.2 | Page header: H1 + subtitle | ⬜ | |
| 4.1.3 | Global filters (Month, Txn Type, Product Type) | ⬜ | Dropdowns, default All |
| 4.1.4 | KPI cards: Total Revenue, Transactions, Avg Margin % | ⬜ | Sparklines, delta vs prev month |
| 4.1.5 | Monthly revenue line chart (Recharts) | ⬜ | IDR formatted Y-axis |
| 4.1.6 | Revenue mix area chart (100% stacked) | ⬜ | RJ vs RI composition |
| 4.1.7 | Monthly performance summary table (TanStack) | ⬜ | Sortable, conditional formatting |
| 4.1.8 | Mobile responsive layout | ⬜ | Stacked filters, full-width cards |

### Page 2 — Product Performance
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.2.1 | KPI cards: Generic Revenue, Branded Revenue, Total SKUs | ⬜ | % of total shown |
| 4.2.2 | Bar chart: Generic vs Branded revenue | ⬜ | 2 bars, simple |
| 4.2.3 | Line chart: Monthly trend by product type | ⬜ | Solid vs dashed lines |
| 4.2.4 | Scatter chart: Revenue vs Margin % (SKU quadrant) | ⬜ | Median lines, 4 quadrant labels |
| 4.2.5 | Top 20 SKUs table (TanStack) | ⬜ | Search, export CSV, sortable |
| 4.2.6 | Mobile responsive layout | ⬜ | Horizontal bars, paginated table |

### Page 3 — Margin Risk
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.3.1 | Global filters + margin threshold slider | ⬜ | Range 0–30%, default 10% |
| 4.3.2 | Risk KPI cards: At-Risk SKUs, Revenue at Risk, Avg Margin % | ⬜ | Red accent |
| 4.3.3 | Scatter: Volume vs Margin % (red/gray dots) | ⬜ | Threshold line moves with slider |
| 4.3.4 | Histogram: SKU margin % distribution | ⬜ | Bars colored by threshold |
| 4.3.5 | At-risk SKU detail table (TanStack) | ⬜ | Auto-filtered, export CSV |
| 4.3.6 | Live update: slider → all components react | ⬜ | Client-side, no re-fetch |
| 4.3.7 | Mobile responsive layout | ⬜ | |

### Deployment
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.4.1 | Configure `next.config.js` for static export | ⬜ | `output: 'export'` |
| 4.4.2 | Build: `npm run build` | ⬜ | Verify no errors |
| 4.4.3 | Deploy to Cloudflare Pages | ⬜ | Connect GitHub repo |
| 4.4.4 | Verify live URL on mobile | ⬜ | |

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

- [ ] SQL scripts run without errors
- [ ] Row counts reconcile with source data (~511,559)
- [ ] All 3 dashboard pages functional with filters
- [ ] Page 3 threshold slider works with live updates
- [ ] Mobile responsive on all pages
- [ ] Cloudflare Pages deployment successful
- [ ] README complete with live URL
