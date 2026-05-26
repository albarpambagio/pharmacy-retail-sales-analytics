# Pharmacy Retail Sales Analytics

> **Scenario:** This analysis was prepared for a hospital pharmacy's Q4 2015 operational review. The deliverable is a performance dashboard and findings brief for the Pharmacy Director and Finance team, supporting 2016 procurement planning and pricing decisions.

**Live Dashboard:** [pharmacy-retail-sales-analytics.pages.dev](https://pharmacy-retail-sales-analytics.pages.dev)

## Table of Contents

- [Background & Overview](#background--overview)
- [Pipeline Architecture](#pipeline-architecture)
- [Executive Summary](#executive-summary)
- [Insights Deep Dive](#insights-deep-dive)
- [Recommendations](#recommendations)
- [Dashboard](#dashboard)
- [Data Traceability](#data-traceability)
- [Technical Implementation](#technical-implementation)
- [Known Limitations](#known-limitations)
- [Quick Start](#quick-start)

---

## Background & Overview

This project analyses **511,559 transaction lines** from a hospital pharmacy's 2015 operational data. The ETL pipeline parses string-encoded prescription numbers (NO_RESEP) to derive transaction type, department, and date — classifies 2,233 SKUs as generic or branded — and loads everything into a PostgreSQL star schema. The dashboard is deployed as a static site on Cloudflare Pages.

### Dataset

| Attribute | Detail |
|-----------|--------|
| Source | [Retail Sales Dataset of a Pharmacy in Indonesia (Mendeley)](https://data.mendeley.com/datasets/2ym7v78wtd/1) |
| License | CC BY 4.0 |
| Volume | ~511,559 transaction lines |
| Date Range | 2015 (12 months; revenue concentrated in Aug–Sep) |
| Columns | NO_RESEP, KD_OBAT, QTY, HNA, HJ, PPN_JUAL |

### Technical Stack

**Python ETL → PostgreSQL (star schema) → Static JSON → Next.js 15 → Cloudflare Pages**

- **Python 3.11+**: ETL pipeline with psycopg2, pandas, numpy
- **PostgreSQL 15**: Star schema (fact_sales + 3 dimensions)
- **Next.js 15**: App Router, static export, TypeScript, Recharts, shadcn/ui
- **Marimo**: Interactive EDA notebooks

### Stakeholder Audience

| Audience | Needs | Dashboard Implication |
|----------|-------|----------------------|
| Pharmacy Director | Overall performance, channel mix | KPI callouts, trend lines, monthly summary |
| Finance | Revenue, margin, pricing risk | Margin analysis, at-risk SKU table, CSV export |
| Procurement | Which SKUs to prioritise in 2016 | Product performance, top 20 table, scatter chart |

### Business Questions Answered

1. **Pharmacy Director:** Which product categories and transaction channels drive the most revenue and gross margin — and how does the mix shift month by month?
2. **Finance:** Where is margin compression risk — high-volume products with dangerously thin margins?
3. **Procurement:** How does generic vs branded medicine performance differ across inpatient and outpatient channels?

---

## Pipeline Architecture

```mermaid
flowchart LR
    A[MariaDB Dump] --> B[convert_and_load.py]
    B --> C[staging.det_sales_raw]
    C --> D[extract.py]
    D --> E[transform.py]
    E --> F[staging.det_sales_transformed]
    F --> G[load.py]
    G --> H[Star Schema]
    H --> I[export_json.py]
    I --> J[dashboard/public/data/*.json]
    J --> K[Next.js Dashboard]
    K --> L[Cloudflare Pages]
```

### Star Schema

```
fact_sales (514K rows)
├── dim_transaction (157K prescriptions)
├── dim_product (2,233 SKUs: Generic / Branded / Other)
└── dim_date (12 months: Jan–Dec 2015)
```

### NO_RESEP Parsing

Prescription numbers encode transaction type, department, and date:
- `RJ-01.2015-08-0001` → Outpatient, Dept 01, Aug 2015
- `RI-01.2015-03-0456` → Inpatient, Dept 01, Mar 2015
- ~92% of records have irregular formats — fallback parsing extracts txn type and dept only

### Data Quality & Cleaning

| Issue | Impact | Resolution |
|-------|--------|-------------|
| `HJ < HNA` (negative margin) | Selling below cost | Flagged in fact_sales, surfaced in Margin Risk page |
| `QTY <= 0` | Invalid transactions | Excluded from revenue calculations, logged |
| `HNA = 0` | Division by zero in margin % | Guard — set margin_pct to NULL |
| Unrecognised `KD_OBAT` prefix | Can't classify product type | Classified as 'Other', count logged |
| Irregular NO_RESEP formats (~92%) | Date parsing incomplete | Fallback extracts txn type + dept; year_month set to NULL |

---

## Executive Summary

### Key Metrics

| Metric | Value | Business Meaning |
|--------|-------|------------------|
| **Total Revenue** | Rp 1.45B | Gross revenue across all channels |
| **Total Transactions** | 38,953 | After QTY ≤ 0 exclusions from 511K lines |
| **Average Margin** | 33.9% | Weighted by revenue |
| **Unique SKUs** | 2,233 | Generic + Branded + Other |
| **SKUs with Negative Margin** | 2 | Selling below cost — flag for pricing review |

### Monthly Revenue Distribution

| Month | Revenue (Rp) | Transactions | Avg Margin % |
|-------|-------------|-------------|-------------|
| 2015-01 | 194,780 | 6 | 22.3% |
| 2015-03 | 37,795,602 | 393 | 36.6% |
| 2015-04 | 18,628,655 | 641 | 37.3% |
| 2015-08 | 445,268,789 | 18,589 | 39.8% |
| 2015-09 | 945,833,898 | 19,324 | 33.4% |
| **Total** | **1,447,721,725** | **38,953** | **33.9%** |

*Source: `dashboard/public/data/overview.json`. Months with no revenue data (Feb, May–Jul, Oct–Dec) are excluded.*

**Finding:** 96% of annual revenue is concentrated in August and September 2015. The remaining active months (Jan, Mar, Apr) account for only 4%. This suggests either partial data for those months or genuine seasonal concentration.

### Product Type × Channel Revenue

| Product Type | Channel | Revenue (Rp) | Transactions | Avg Margin % |
|-------------|---------|-------------|-------------|-------------|
| Branded | Inpatient | 1,857,480,579 | 40,079 | 34.7% |
| Branded | Outpatient | 2,569,085,697 | 76,433 | 35.4% |
| Branded | Unknown | 1,231,392,040 | 19,629 | 33.9% |
| Generic | Inpatient | 3,619,933,441 | 118,102 | 34.5% |
| Generic | Outpatient | 4,353,155,815 | 129,817 | 35.1% |
| Generic | Unknown | 2,129,917,579 | 67,920 | 34.3% |

*Source: `dashboard/public/data/products.json` — `product_type_revenue` array.*

**Finding:** Generic medicines drive higher total revenue (Rp 10.1B vs Rp 5.7B for branded) and higher transaction volume. The margin gap is marginal (~1pp), suggesting pricing is competitive across both categories.

---

## Insights Deep Dive

### Revenue & Margin Mix

**Finding 1 — Revenue concentrated in 2 months:** August and September 2015 account for 96% of annual revenue (Rp 1.39B of Rp 1.45B). January has only 6 transactions (Rp 195K). This is either a data completeness issue or reflects genuine operational patterns.

**Finding 2 — Outpatient drives volume, Inpatient drives value:** Outpatient (RJ) accounts for 206,250 transactions vs 158,181 for Inpatient (RI). However, Inpatient transactions have higher per-transaction revenue, particularly for branded medicines.

**Finding 3 — Margin stable across active months:** Average margin ranges from 22.3% (January, small sample) to 39.8% (August). The weighted average of 33.9% is consistent with Indonesian pharmacy industry benchmarks.

### Product Mix

**Finding 4 — Generic dominates volume, branded carries margin:** Generic medicines (AI-* prefix) account for 315,839 transactions (81% of total) vs 136,141 for branded (35%). The margin gap is marginal (~1pp), suggesting pricing is competitive across both categories.

**Finding 5 — Unknown channel is significant:** 136,141 transactions (35%) have irregular NO_RESEP formats and can't be classified as Outpatient or Inpatient. These "Unknown" transactions contribute Rp 3.36B in revenue — 23% of total. This is a data quality limitation, not a business insight.

### Margin Risk

**Finding 6 — 2 SKUs with negative margins identified:**

| SKU | Product Type | Revenue (Rp) | Avg Margin % | Avg HNA | Avg HJ |
|-----|-------------|-------------|-------------|---------|--------|
| R-1322 | Branded | 333,655 | -11.6% | 12,575 | 11,122 |
| R-4605 | Branded | 65,131 | -11.0% | 73,182 | 65,131 |

*Source: `dashboard/public/data/margin_risk.json` — `skus` array, sorted by avg_margin_pct ASC.*

**Finding:** Both negative-margin SKUs are branded medicines. R-1322 has 30 units sold at a loss — this is not a trivial volume. These should be flagged for immediate pricing review.

---

## Recommendations

| # | Finding | Stakeholder | Action | Confidence |
|---|---------|-------------|--------|------------|
| 1 | 2 SKUs selling below cost (R-1322, R-4605) | Procurement | Immediate pricing review or supplier renegotiation | High |
| 2 | High-volume generics with thin margins | Finance | Flag for 2016 procurement planning — review top 20 SKUs below 10% threshold | High |
| 3 | Revenue concentrated in Aug–Sep (96%) | Pharmacy Director | Investigate data completeness for other months before drawing seasonal conclusions | Medium |
| 4 | 35% of transactions have irregular NO_RESEP | Data Engineering | Work with source system team to standardise prescription number format | Medium |

### Combined Impact Estimate

| Initiative | Estimate | Confidence |
|------------|----------|------------|
| Pricing review for negative-margin SKUs | Prevent further loss on R-1322 (30 units × ~Rp 1,453/unit loss ≈ Rp 43,590) | High |
| Margin threshold review (10% cutoff) | Identify and address all SKUs below threshold — interactive tool in dashboard | High |
| Data completeness investigation | Clarify whether Aug–Sep concentration is real or data issue | Medium |

---

## Dashboard

| Page | Route | Decision | Audience |
|------|-------|----------|----------|
| Executive Overview | `/` | How did the pharmacy perform in 2015? | Pharmacy Director |
| Product Performance | `/products` | Which products to prioritise in 2016? | Finance + Procurement |
| Margin Risk | `/margin-risk` | Which SKUs need pricing review? | Finance |

**Features:**
- Global filters: Month (Jan–Dec), Transaction Type (Outpatient/Inpatient), Product Type (Generic/Branded)
- Interactive margin threshold slider (0–30%, default 10%)
- Scatter chart: volume vs margin with threshold line
- Histogram: SKU margin distribution
- At-risk SKU table with search, sort, pagination, and CSV export

---

## Data Traceability

Every metric in this report is traceable to an exported JSON file generated from the star schema.

| Metric | Source File | SQL Query |
|--------|-------------|-----------|
| Monthly revenue, transactions, margin | `overview.json` | `export_json.py:27` — fact_sales JOIN dim_date, dim_transaction, dim_product |
| Product type × channel revenue | `products.json` | `export_json.py:62` — GROUP BY product_type, transaction_type |
| SKU scatter (revenue vs margin) | `products.json` | `export_json.py:92` — GROUP BY kd_obat, product_type |
| Top 20 SKUs | `products.json` | `export_json.py:107` — ORDER BY revenue DESC LIMIT 20 |
| SKU margins (all SKUs) | `margin_risk.json` | `export_json.py:132` — GROUP BY kd_obat, product_type |
| Margin histogram | `margin_risk.json` | `export_json.py:148` — 30-bin distribution computed in Python |

---

## Technical Implementation

### ETL Scripts (`/etl/` folder)

| Script | Description |
|--------|-------------|
| `config.py` | Centralized DB configuration, batch ID generation |
| `convert_and_load.py` | MariaDB dump → PostgreSQL conversion + staging load |
| `extract.py` | Validate staging data, log statistics |
| `transform.py` | Parse NO_RESEP, classify products, calculate revenue/margin, assign price tiers |
| `load.py` | Build star schema (fact_sales + 3 dimensions), track batch lineage |
| `export_json.py` | Query star schema, export static JSON for dashboard |

### Analysis (`/analysis/` folder)

| Script | Description |
|--------|-------------|
| `eda.py` | Headless EDA using SCAN framework |
| `eda_notebook.py` | Marimo interactive notebook with 8 charts |
| `deep_dive.py` | North Star method analysis for 3 exec-driven questions |

### Dashboard (`/dashboard/` folder)

Built with Next.js 15 (App Router), static export, TypeScript, Recharts, shadcn/ui. Deployed to Cloudflare Pages via GitHub Actions (`.github/workflows/deploy.yml`).

```bash
cd dashboard
npm install            # Install dependencies
npm run dev            # Development server at localhost:3000
npm run build          # Static export to out/
npm run deploy         # Build + deploy to Cloudflare Pages
npm run deploy:preview # Build + deploy to preview branch
```

---

## Known Limitations

| Limitation | Impact | How to Address |
|------------|--------|---------------|
| Single year (2015) — no YoY | No year-over-year comparison | Monthly granularity gives 12 data points for trend analysis |
| Single location | Findings not generalizable | Validation needed across other outlets |
| No patient/diagnosis data | Limited clinical insight | Revenue analysis sufficient for procurement decisions |
| Irregular NO_RESEP formats (~92%) | 35% of transactions classified as "Unknown" channel | Fallback parsing extracts txn type + dept; year_month set to NULL |
| Revenue concentrated in 2 months | May reflect data incompleteness rather than seasonality | Investigate source system data completeness before drawing conclusions |
| Dataset is 10 years old | Historical context only | Analytical approach and pipeline architecture remain valid |

---

## Quick Start

```bash
# 1. Database
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE db_pharmacy;"
psql -h localhost -p 5433 -U postgres -d db_pharmacy -f sql/01_create_schema.sql
psql -h localhost -p 5433 -U postgres -d db_pharmacy -f sql/02_create_star_schema.sql

# 2. Load raw data (MariaDB → PostgreSQL)
uv sync
uv run python etl/convert_and_load.py

# 3. ETL pipeline
uv run python etl/extract.py
uv run python etl/transform.py
uv run python etl/load.py
uv run python etl/export_json.py

# 4. Dashboard (local dev)
cd dashboard && npm install && npm run dev

# 5. Deploy to Cloudflare Pages (requires wrangler auth)
cd dashboard && npm run deploy

# CI/CD: Push to master → GitHub Actions auto-deploys via .github/workflows/deploy.yml

# 5. EDA notebooks (optional)
uv run marimo edit analysis/eda_notebook.py
```

---

## Data Source

**Retail Sales Dataset of a Pharmacy in Indonesia**  
[Download from Mendeley](https://data.mendeley.com/datasets/2ym7v78wtd/1)  
Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

**Albar Pambagio**  
GitHub: [@albarpambagio](https://github.com/albarpambagio)
