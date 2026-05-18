# AGENTS.md

## Project Overview

Pharmacy Retail Sales Analytics — End-to-end ETL pipeline + interactive dashboard for a hospital pharmacy's 2015 operational data.

| Attribute | Detail |
|-----------|--------|
| **Dataset** | Retail Sales Dataset of a Pharmacy in Indonesia (Mendeley, CC BY 4.0) |
| **Source** | Hospital pharmacy system (MariaDB export), 2015 |
| **Volume** | ~511,559 transaction lines |
| **Stack** | Python → PostgreSQL → Static JSON → Next.js (Shadboard) → Cloudflare Pages |
| **Portfolio Goal** | Demonstrate end-to-end ETL pipeline + analyst insight skills |

### Business Scenario

This analysis was prepared for a hospital pharmacy's Q4 2015 operational review. The deliverable is a performance dashboard and findings brief for the Pharmacy Director and Finance team, supporting 2016 procurement planning and pricing decisions.

---

## Exec-Driven Questions

| # | Question | Primary Stakeholder |
|---|----------|---------------------|
| 1 | Which product categories and transaction channels drive the most revenue and gross margin — and how does the mix shift month by month? | Pharmacy Director, Finance |
| 2 | Where is margin compression risk — high-volume products with dangerously thin margins? | Finance, Procurement |
| 3 | How does generic vs branded medicine performance differ across inpatient and outpatient channels? | Pharmacy Director, Procurement |

---

## Setup Commands

### Database Setup
```bash
# Create database
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE db_pharmacy;"

# Create staging schema
psql -h localhost -p 5433 -U postgres -d db_pharmacy -f sql/01_create_schema.sql

# MariaDB dump needs conversion — use convert_and_load.py instead (see below)
```

### Python Dependencies
```bash
uv venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

uv pip install psycopg2-binary pandas
```

### MariaDB Dump → PostgreSQL (one-time)
The raw dump uses MariaDB syntax. Run this conversion script instead of `psql -f`:
```bash
uv run python etl/convert_and_load.py
```

### Run ETL Pipeline
```bash
uv run python etl/extract.py      # Validate staging data
uv run python etl/transform.py    # Parse, classify, calculate metrics
uv run python etl/load.py         # Build star schema
uv run python etl/export_json.py  # Export to static JSON for dashboard
```

### Dashboard Setup
```bash
cd dashboard
npm install
npm run dev                # Development server
npm run build              # Static build for deployment
```

---

## Development Workflow

### Phase Pipeline

```
Phase 0: Setup        → Folder structure, database, Next.js init
Phase 1: ETL          → extract.py → transform.py → load.py → export_json.py
Phase 2: EDA          → analysis/eda.py (SCAN framework)
Phase 3: Deep Dive    → analysis/deep_dive.py (North Star method)
Phase 4: Dashboard    → 3 pages in Next.js + Shadboard
Phase 5: Write-up     → README, insights, recommendations
```

### Data Schema

**Staging Table** (`staging.det_sales_raw`)
| Column | Type | Notes |
|--------|------|-------|
| NO_RESEP | varchar(20) | Prescription number — contains txn type, dept, date |
| KD_OBAT | varchar(20) | Medicine code — AI-* = Generic, R-* = Branded |
| QTY | double | Quantity (can be fractional for liquids/powders) |
| HNA | double | Harga Netto Apotek (net price, excl. VAT) |
| HJ | double | Harga Jual (selling price, excl. VAT) |
| PPN_JUAL | float | VAT percentage (10 for RJ/outpatient, 0 for RI/inpatient) |

**Star Schema**
```
fact_sales
├── fact_id (PK)
├── no_resep (FK → dim_transaction)
├── kd_obat (FK → dim_product)
├── date_key (FK → dim_date)
├── qty, hna, hj
├── revenue, gross_margin, margin_pct
└── tax_inclusive

dim_transaction
├── no_resep (PK)
├── transaction_type (Outpatient / Inpatient)
└── dept_code

dim_product
├── kd_obat (PK)
├── product_type (Generic / Branded / Other)
└── price_tier (Low / Mid / High / Premium)

dim_date
├── date_key (PK)
├── year_month (2015-01 … 2015-12)
├── month_num (1–12)
└── month_name (January … December)
```

### NO_RESEP Parsing Logic

Standard format: `RJ-01.2015-08-0001`
- `RJ` or `RI` → transaction type (Outpatient/Inpatient)
- `01` → department code
- `2015-08` → year-month
- `0001` → sequence number

**Irregular formats** (e.g., `RI-01.0780`, `RI-01.3706`):
- Extract transaction type and dept_code
- Set year_month to NULL
- Log count of irregular rows

---

## Testing Instructions

### Verify Data Loading
```bash
psql -h localhost -p 5433 -U postgres -d db_pharmacy -c "SELECT COUNT(*) FROM staging.det_sales_raw;"
# Expected: ~511,559 rows
```

### Verify Star Schema
```bash
psql -h localhost -p 5433 -U postgres -d db_pharmacy -c "SELECT COUNT(*) FROM fact_sales;"
# Should match staging (minus QTY ≤ 0 exclusions)

psql -h localhost -p 5433 -U postgres -d db_pharmacy -c "SELECT COUNT(DISTINCT year_month) FROM dim_date;"
# Expected: 12 months (Jan–Dec 2015)
```

### Verify Revenue
```bash
psql -h localhost -p 5433 -U postgres -d db_pharmacy -c "SELECT SUM(revenue) FROM fact_sales;"
# Should be non-zero and within expected IDR range
```

### Verify JSON Export
```bash
ls dashboard/public/data/
# Expected: overview.json, products.json, margin_risk.json
```

---

## Code Style

### Python Scripts
- Snake_case naming: `extract.py`, `transform.py`, `load.py`
- Docstrings for functions
- Logging to `logs/` folder
- Error handling with try/except, log failures

### SQL Conventions
- Natural keys used (no_resep, kd_obat) — not surrogate IDs
- Timestamps: use `date` type, not `timestamp`

### Project Structure
```
pharmacy-sales-analytics/
├── docs/
│   └── data/
│       └── temp/
│           └── sales.sql          # Original MariaDB dump — never modified
├── sql/
│   ├── 01_create_schema.sql       # Staging table creation
│   └── 02_create_star_schema.sql  # Star schema tables
├── etl/
│   ├── extract.py                 # Load raw data
│   ├── transform.py               # Parse, classify, calculate
│   ├── load.py                    # Build star schema
│   └── export_json.py             # Export to static JSON
├── analysis/
│   ├── eda.py                     # EDA using SCAN framework
│   └── deep_dive.py               # Deep dive analysis
├── dashboard/                     # Next.js + Shadboard app
│   ├── public/
│   │   └── data/                  # Static JSON files
│   │       ├── overview.json
│   │       ├── products.json
│   │       └── margin_risk.json
│   └── src/
├── docs/
│   ├── issues_log.md
│   └── insights_log.md
├── logs/
│   └── pipeline_run.log
├── requirements.txt
└── README.md
```

---

## Dashboard Architecture

### Pages
| Page | Decision | Data Source |
|------|----------|-------------|
| 1 — Executive Overview | "How did the pharmacy perform in 2015?" | `overview.json` |
| 2 — Product Performance | "Which products to prioritise in 2016?" | `products.json` |
| 3 — Margin Risk | "Which SKUs need pricing review?" | `margin_risk.json` |

### Filters (global across all pages)
- Month (Jan–Dec 2015)
- Transaction Type (Outpatient / Inpatient / All)
- Product Type (Generic / Branded / All)

### Page 3 Specific: Margin Threshold Slider
- Range: 0%–30%, default 10%
- All components react in real-time (client-side)
- Scatter chart: red dots below threshold, gray above
- Histogram: bars colored by threshold position
- Table: auto-filters to at-risk SKUs only

### Deployment
- Build: `next build` with `output: 'export'`
- Host: Cloudflare Pages
- Free tier: unlimited bandwidth, global CDN, automatic HTTPS

---

## Known Limitations

| Limitation | Mitigation |
|------------|------------|
| Single year (2015) — no YoY | Monthly granularity gives 12 data points for trend analysis |
| Single location | Findings need validation across other outlets |
| No patient/diagnosis data | Revenue analysis sufficient for procurement decisions |
| Dataset is 10 years old | Analytical approach and pipeline architecture remain valid |
| Irregular NO_RESEP formats | Fallback parsing logic, logged and documented |

---

## Success Criteria

1. README tells the full story in under 5 minutes
2. Live Cloudflare Pages URL answers all three exec-driven questions
3. Pipeline walkthrough is confident and specific (NO_RESEP parsing, star schema, JSON export)
4. Limitations are pre-empted with thoughtful answers
