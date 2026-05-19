# Pharmacy Retail Sales Analytics — Project Plan

## Project Brief

| Attribute | Detail |
|-----------|--------|
| **Dataset** | Retail Sales Dataset of a Pharmacy in Indonesia (Mendeley, CC BY 4.0) |
| **Source** | Hospital pharmacy system (MariaDB export), 2015 |
| **Data First Accessed** | 2026-05-18 |
| **Source URL** | https://data.mendeley.com/datasets/2ym7v78wtd/1 |
| **Volume** | ~511,559 transaction lines |
| **Stack** | Python → PostgreSQL → Static JSON → Next.js (Shadboard) + Marimo (EDA notebooks) → Cloudflare Pages |
| **Portfolio Goal** | Demonstrate end-to-end ETL pipeline + analyst insight skills |

### Business Scenario

> *This analysis was prepared for a hospital pharmacy's Q4 2015 operational review. The deliverable is a performance dashboard and findings brief for the Pharmacy Director and Finance team, supporting 2016 procurement planning and pricing decisions.*

---

## Exec-Driven Questions

Three business questions anchor the entire project. Every analytical decision traces back to at least one of these.

| # | Question | Primary Stakeholder | Type |
|---|----------|---------------------|------|
| 1 | Which product categories and transaction channels drive the most revenue and gross margin — and how does the mix shift month by month across 2015? | Pharmacy Director, Finance | North Star |
| 2 | Where is our margin compression risk — high-volume products with dangerously thin margins that should be flagged for procurement? | Finance, Procurement | Deep Dive |
| 3 | How does generic vs branded medicine performance differ across inpatient and outpatient channels? | Pharmacy Director, Procurement | Cross-tabulation |

---

## North Star Definitions

| Element | Definition |
|---------|------------|
| **North Star Metric** | Gross Revenue (`QTY × HJ`) |
| **North Star Dimensions** | Transaction type (inpatient/outpatient), Product type (generic/branded), Month |
| **Secondary Metric** | Gross Margin per line (`HJ − HNA`) and Margin % |
| **North Star Team Goals** | Finance → where is revenue and margin coming from? Procurement → which SKUs to prioritize or de-risk? |

---

## READY Framework Checklist

| Pillar | How This Project Satisfies It |
|--------|-------------------------------|
| **R — Representative Data** | Real Indonesian hospital pharmacy system export, 511K rows, messy string-encoded dimensions, fractional quantities, dual VAT logic |
| **E — Exec-Driven Questions** | Three questions tied to Pharmacy Director and Finance decisions, not open-ended exploration |
| **A — Analytical Frameworks** | CLEAN for data quality, SCAN for EDA, North Star Method for deep dive, DASH for dashboard |
| **D — Data Best Practices** | Star schema, documented issues log and insights log, commented Python, reproducible pipeline |
| **Y — Your Insights & Impact** | Quantified findings mapped to specific stakeholder recommendations |

---

## Phase 0 — Project Setup

**Goal:** Establish scaffolding before touching any data.

### Tasks

- [ ] Create GitHub repository with folder structure (see below)
- [ ] Write business scenario and stakeholder brief in README
- [ ] Define North Star Metric, Dimensions, and Team Goals
- [ ] Document dataset source, license, and download instructions
- [ ] Set up PostgreSQL database (`db_pharmacy`)
- [ ] Create virtual environment and `requirements.txt`
- [ ] Initialise Next.js app using Shadboard starter-kit inside `/dashboard`

### Folder Structure

```
pharmacy-sales-analytics/
├── data/
│   └── raw/               # Original SQL dump — never modified
├── sql/
│   ├── 01_create_schema.sql
│   └── 02_create_star_schema.sql
├── etl/
│   ├── config.py         # Centralized DB configuration and batch ID generation
│   ├── extract.py
│   ├── transform.py
│   ├── load.py
│   └── export_json.py     # Exports query results to static JSON
├── analysis/
│   ├── eda.py                 # Headless EDA script (SCAN framework)
│   ├── eda_notebook.py        # Marimo notebook with interactive EDA charts
│   └── deep_dive.py
├── dashboard/             # Next.js + Shadboard app
│   ├── public/
│   │   └── data/          # Static JSON files served to frontend
│   │       ├── overview.json
│   │       ├── products.json
│   │       └── margin_risk.json
│   ├── src/
│   │   └── app/
│   │       └── ...        # Shadboard pages and components
│   └── package.json
├── docs/
│   ├── issues_log.md
│   └── insights_log.md
├── logs/
│   └── pipeline_run.log
├── requirements.txt
└── README.md
```

### Key Deliverable
README scaffold with business scenario written before any analysis begins.

---

## Phase 1 — ETL Pipeline

**Goal:** Build a documented, reproducible pipeline from raw SQL dump to a clean star schema. This is the primary technical differentiator from the Olist project.

### 1.1 Extract

**Script:** `etl/extract.py`

- Load raw `det_sales` table from MariaDB SQL dump into PostgreSQL staging table (`staging.det_sales_raw`)
- Preserve original data exactly — no transformations at extract stage
- Log row count on load for validation

### 1.2 Transform

**Script:** `etl/transform.py`

This is the non-trivial part that makes this ETL rather than just loading CSVs.

**Parse `NO_RESEP` string to derive dimensions:**

```
RJ-01.2015-08-0001
 ↓
transaction_type = 'Rawat Jalan' (Outpatient)
dept_code        = '01'
year_month       = '2015-08'
transaction_date = 2015-08-01  (approximated to month-start)
```

| Derived Column | Logic |
|---------------|-------|
| `transaction_type` | `RJ-` → Outpatient, `RI-` → Inpatient |
| `dept_code` | Characters 3–4 of NO_RESEP |
| `year_month` | Characters 6–12 of NO_RESEP |
| `transaction_date` | Parse to date (month grain) |

**Classify `KD_OBAT` to derive product type:**

| Prefix | Classification |
|--------|---------------|
| `AI-` | Generic |
| `R-` | Branded/Ethical |

**Calculate financial metrics:**

```python
revenue        = QTY * HJ
gross_margin   = HJ - HNA
margin_pct     = ((HJ - HNA) / HNA) * 100  # guard against HNA = 0
tax_inclusive  = 1 if PPN_JUAL == 10 else 0
```

**Assign price tier:**

| Tier | HJ Range (IDR) |
|------|---------------|
| Low | < 500 |
| Mid | 500 – 10,000 |
| High | 10,000 – 100,000 |
| Premium | > 100,000 |

**CLEAN Framework — Transformations to validate and document:**

| Check | Action |
|-------|--------|
| `HJ < HNA` (negative margin) | Flag in issues log, do not drop |
| `QTY <= 0` | Flag and exclude from revenue calculations |
| `HNA = 0` | Guard division — set margin_pct to NULL |
| Fractional QTY (e.g. 2.5) | Retain — valid for liquid/powder medicines |
| Unrecognised `KD_OBAT` prefix | Classify as 'Other', log count |
| Unrecognised `NO_RESEP` prefix | Classify as 'Unknown', log count |

### 1.3 Load — Star Schema

**Script:** `etl/load.py`  
**SQL:** `sql/02_create_star_schema.sql`

```
fact_sales
├── fact_id (PK)
├── no_resep (FK → dim_transaction)
├── kd_obat (FK → dim_product)
├── date_key (FK → dim_date)
├── qty
├── hna
├── hj
├── revenue
├── gross_margin
├── margin_pct
└── tax_inclusive

dim_transaction
├── no_resep (PK)
├── transaction_type     (Outpatient / Inpatient)
└── dept_code

dim_product
├── kd_obat (PK)
├── product_type         (Generic / Branded / Other)
└── price_tier           (Low / Mid / High / Premium)

dim_date
├── date_key (PK)
├── year_month           (2015-01 … 2015-12)
├── month_num            (1–12)
└── month_name           (January … December)
```

### 1.4 Export — Static JSON

**Script:** `etl/export_json.py`

This step is what connects the pipeline to the dashboard. After the star schema is loaded, run SQL queries against PostgreSQL and write the results to static JSON files inside `dashboard/public/data/`. The Next.js frontend reads these files at build time — no live database connection needed.

| Output File | SQL Query | Used By |
|-------------|-----------|---------|
| `overview.json` | Monthly revenue, transaction count, avg margin % by month | Page 1 — Executive Overview |
| `products.json` | Revenue, margin %, transaction count by product type and SKU | Page 2 — Product Performance |
| `margin_risk.json` | SKUs below 10% margin threshold with revenue and volume | Page 3 — Margin Risk |

**Why static JSON is the right choice here:**
- Dataset is fixed (2015 only) — no live updates needed
- Eliminates backend API complexity entirely
- Deployable to Cloudflare Pages as a pure static site
- Hiring managers can click a live URL — more impressive than a `.pbix` file they can't open

### 1.5 Pipeline Validation

Before proceeding to analysis, confirm:

- [ ] Row count in `fact_sales` matches staging row count (minus excluded QTY ≤ 0)
- [ ] All `dim_product` and `dim_transaction` foreign keys resolve (no orphaned fact rows)
- [ ] Monthly distribution of transactions is reasonable (no missing months)
- [ ] Revenue total is non-zero and within expected IDR range
- [ ] Issues log updated with counts for each flagged category
- [ ] Batch ID tracked in `fact_sales.etl_batch_id` and `staging.et_sales_transformed.etl_batch_id`
- [ ] Lineage table `etl.lineage` populated with batch status, row counts

### Key Deliverable
Documented pipeline with a clear issues log. The README should include a simple flowchart:

```
Raw SQL Dump → staging.det_sales_raw → transform.py → fact_sales + dims → export_json.py → /dashboard/public/data/*.json → Next.js (Shadboard) → Cloudflare Pages
```

---

## Phase 2 — Data Cleaning & EDA (SCAN Framework)

**Goal:** Surface high-level patterns, build the insights log, identify which segments deserve deep-dive attention.

### S — Stakeholder Goals

Restate before analysis begins:
- Finance wants to know where revenue and margin come from
- Procurement wants to know which SKUs to prioritize or flag

### C — Columns and Coverage

Document upfront what this dataset *cannot* answer:
- No patient demographics (can't segment by age or condition)
- No competitor pricing data (can't benchmark margins externally)
- Single year only (no YoY comparison — mitigate by emphasising monthly trends)
- No stock/inventory data (can't calculate stockout risk directly)

**Deliverable:** `docs/scan-columns-coverage.md` — Comprehensive documentation of:
- All columns available and their derivation logic
- What the dataset CAN answer (8 business questions)
- What the dataset CANNOT answer (8 limitations)
- Data quality summary with counts and percentages
- Recommendations for next data request

### A — Aggregates and Anomalies

Run these pivot-level analyses using SQL or Python, document findings in insights log. All 8 charts are rendered in a marimo notebook (`analysis/eda_notebook.py`) for interactive exploration:

| Analysis | Why |
|----------|-----|
| Monthly revenue total (Jan–Dec) | Check for seasonality, anomalous months |
| Monthly transaction count | Distinguish volume vs value trends |
| Revenue by transaction type (RJ vs RI) | Channel split |
| Revenue by product type (generic vs branded) | Product split |
| Top 20 SKUs by revenue | Concentration check |
| Margin % distribution (histogram) | Identify margin compression cluster |
| Price tier distribution | Understand SKU mix |

### N — Notable Segments

After aggregates, identify 2–3 segments worth deep-diving. Expected candidates based on dataset characteristics:
- The inpatient vs outpatient revenue split (VAT difference may distort apparent margin)
- Generic vs branded margin gap
- Any months with unusual revenue spikes or drops

### Key Deliverable
Populated insights log with at least 5 findings, each with: metric, dimension, finding (quantified), stakeholder team.

Interactive marimo notebook at `analysis/eda_notebook.py` with all 8 charts + inline explanations. View via `uv run marimo edit analysis/eda_notebook.py`.

---

## Phase 3 — Deep Dive Analysis (North Star Method)

**Goal:** Answer the three exec-driven questions with quantified, stakeholder-ready findings.

### Question 1 — Revenue and Margin Mix

**Step 1:** Plot monthly revenue as absolute line chart → identify trend direction

**Step 2:** Layer transaction type (RJ/RI) as area chart → see mix shift over months

**Step 3:** Decompose revenue into `transaction count × avg revenue per transaction` split by channel → identify whether volume or value is driving monthly movement

**Expected insight pattern:**
> *"Outpatient (RJ) accounts for X% of total revenue but Y% of total gross margin — the VAT differential and branded medicine mix mean inpatient transactions are [more/less] margin-efficient per IDR of revenue."*

### Question 2 — Margin Compression Risk

**Step 1:** Calculate margin % for every SKU, rank by revenue volume

**Step 2:** Identify products in the top quartile of revenue volume but bottom quartile of margin % — these are the compression risk SKUs

**Step 3:** Cross-check: are these generic or branded? Inpatient or outpatient?

**Expected insight pattern:**
> *"X SKUs account for Y% of total revenue but carry a margin below Z%. Of these, N are generic medicines in the outpatient channel — flagging for procurement review."*

### Question 3 — Generic vs Branded × Channel Cross-tabulation

**Step 1:** Build 2×2 cross-tab: product type (generic/branded) × transaction type (inpatient/outpatient) — showing revenue, transaction count, and avg margin % per cell

**Step 2:** Identify which cell drives the most revenue vs most margin

**Step 3:** Check if the mix is stable across months or shifts seasonally

**Expected insight pattern:**
> *"Branded medicines in the outpatient channel generate the highest revenue (X%) but generic medicines carry a higher average margin % (Y% vs Z%). The pharmacy is trading margin efficiency for volume in its outpatient branded mix."*

### Insights Log Template

For each finding:

```
Finding #:
Metric:
Dimension:
Finding (quantified):
Type: Contextual / Directional / Actionable
Stakeholder Team:
Recommendation:
```

### Export Verification

All CSV exports from `deep_dive.py` are verified before completion:

| Check | Implementation |
|-------|---------------|
| Required columns present | `verify_export()` checks column list |
| Row count minimum | Fails if below `min_rows` parameter |
| NULL values in critical columns | Flags any NULLs in required fields |
| Exit on failure | `sys.exit(1)` if any verification fails |

---

## Phase 4 — Dashboard (Shadboard + Next.js, DASH Framework)

**Goal:** A clean, deployable, decision-oriented 3-page dashboard built on Shadboard. Deployed to Cloudflare Pages as a live public URL.

**Tech:** Next.js 15 + Shadboard starter-kit + Recharts (already included in Shadboard) + TanStack Table for detail views. Data sourced from static JSON files generated in Phase 1.4.

### D — Decision Each Page Enables

| Page | Decision |
|------|----------|
| 1 — Executive Overview | "How did the pharmacy perform in 2015?" (Pharmacy Director) |
| 2 — Product Performance | "Which products and categories should we prioritise in 2016 procurement?" (Finance + Procurement) |
| 3 — Margin Risk | "Which SKUs need pricing or procurement review before 2016?" (Finance) |

### A — Audience

| Page | Audience | Implication |
|------|----------|-------------|
| Overview | Pharmacy Director (less technical) | KPI callouts, trend lines, minimal numbers |
| Product Performance | Finance Manager (mixed) | Charts + summary tables |
| Margin Risk | Procurement/Finance Analyst (more technical) | Detail table, threshold flags |

### S — Signal: Top Metrics Per Page

**Page 1 — Executive Overview** (reads from `overview.json`)
- KPI cards: Total Revenue (IDR), Total Transactions, Average Margin %
- Monthly revenue trend (Recharts LineChart)
- Revenue mix by transaction type — outpatient vs inpatient (Recharts AreaChart as % of total)

**Page 2 — Product Performance** (reads from `products.json`)
- Revenue by product type: generic vs branded (Recharts BarChart)
- Monthly revenue by product type (Recharts LineChart)
- Top 20 SKUs table: revenue, transaction count, margin % (TanStack Table — sortable)
- Scatter plot: Revenue vs Margin % per SKU (Recharts ScatterChart — quadrant view)

**Page 3 — Margin Risk** (reads from `margin_risk.json`)
- KPI card: SKU count below 10% margin threshold + total revenue at risk
- Volume vs Margin scatter (Recharts ScatterChart: transaction count × margin %, dot sized by revenue)
- Detail table: SKU, product type, transaction type, revenue, margin %, risk flag (TanStack Table)

### H — Hierarchy Rules

- Top-left to bottom-right: most important first
- KPI cards always on top row
- Color: Shadboard's default neutral palette + red exclusively for below-threshold flags
- Every page answerable in 60 seconds at a glance
- Mobile responsive — Shadboard handles this out of the box

### Filters (global across all pages)
- Month (Jan–Dec 2015)
- Transaction Type (Outpatient / Inpatient / All)
- Product Type (Generic / Branded / All)

### Deployment

| Step | Detail |
|------|--------|
| Build | `next build` with `output: 'export'` for fully static output |
| Host | Cloudflare Pages — connect GitHub repo, set build command to `cd dashboard && next build` |
| Free tier | Unlimited bandwidth, global CDN, automatic HTTPS, no cold starts |
| Live URL | Include prominently in README and GitHub repo description |

### Key Deliverable
Live public URL on Cloudflare Pages. Screenshot previews in README. This is the portfolio differentiator — a hiring manager can open it on their phone during the interview.

---

## Phase 5 — Insights, Recommendations & Write-up

**Goal:** Package everything into a hiring-manager-ready README and a stakeholder brief.

### Three Types of Insights to Document

| Type | Example for This Project |
|------|--------------------------|
| Contextual | "Single-year data limits YoY comparison; monthly grain used instead" |
| Directional | "Inpatient margin appears higher but requires validation against actual procurement costs not in this dataset" |
| Actionable | "5 high-volume generic SKUs carry margin below 5% — flag for renegotiation with supplier" |

### Recommendations Template

For each actionable insight, document:
- **Finding:** What the data shows (quantified)
- **Stakeholder:** Who owns the decision
- **Action:** What they should do
- **Confidence:** High / Medium / Low, with rationale

### README Structure

```
1. Business Scenario (2–3 sentences)
2. Exec-Driven Questions
3. Pipeline Architecture (flowchart diagram)
4. Live Dashboard URL (Cloudflare Pages — prominent, top of README)
5. Key Findings (3–5 bullets, quantified)
6. Dashboard Preview (screenshot)
7. Recommendations (mapped to stakeholder teams)
8. Data Limitations
9. How to Reproduce (setup instructions)
10. Lessons Learned (honest reflection — good for interviews)
```

### Key Deliverable
README that tells the full story in under 5 minutes of reading. This is what the interviewer reads after they receive your follow-up email.

---

## Interview Stories This Project Enables

Map to common interview questions using the guide's framework:

| Interview Question | Answer From This Project |
|-------------------|--------------------------|
| "Tell me about a time you found inconsistencies in your data." | Walk through CLEAN framework — flagged negative margins, fractional QTY logic, zero HNA guard, unrecognised prefixes. Show the issues log. |
| "Have you built a data pipeline before?" | Walk through extract → transform → load → export. Specifically the NO_RESEP string parsing — a hiring manager at Kimia Farma or K24 will recognise that as a real pharmacy system pattern. |
| "How do you ensure your insights are understandable to non-technical stakeholders?" | Walk through the DASH framework — three pages, each tied to a specific decision and audience. Then open the live dashboard URL. |
| "Tell me about a time you analysed a large dataset." | 511K rows, derived 6 new columns from string parsing, built a star schema, exported to static JSON, found that [quantified finding here]. |
| "Why pharma/health retail?" | Honest: dataset was the best real Indonesian transactional data available publicly. Shows resourcefulness and ability to work with what exists — a real-world constraint every analyst faces. |
| "Have you worked with modern data tooling?" | End-to-end stack: Python ETL, PostgreSQL star schema, static JSON export, Next.js dashboard deployed on Cloudflare Pages. It's live — here's the URL. |

---

## Known Limitations to Pre-empt in Interviews

| Limitation | How to Address It |
|------------|-------------------|
| Single year (2015) — no YoY | "Monthly granularity gives 12 data points for trend analysis. In a real role I would request multi-year data as a first step." |
| Single location | "This represents one pharmacy's operational data. Findings would need validation across other outlets before scaling recommendations." |
| No patient or diagnosis data | "Revenue analysis is sufficient for procurement and pricing decisions; clinical segmentation would require a separate data request." |
| Dataset is 10 years old | "The analytical approach and pipeline architecture are identical to what I'd apply to current data. The domain logic — VAT handling, generic vs branded margins — remains valid." |

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|---------------|
| Phase 0 — Setup | 0.5 days |
| Phase 1 — ETL Pipeline + JSON Export | 3–4 days |
| Phase 2 — EDA | 1–2 days |
| Phase 3 — Deep Dive | 2 days |
| Phase 4 — Shadboard Dashboard + Deployment | 2–3 days |
| Phase 5 — Write-up | 1 day |
| **Total** | **~10–13 days** |

---

## Success Criteria

This project is done when a hiring manager can:

1. Read the README in 5 minutes and understand the business question, pipeline, and key findings
2. Click the live Cloudflare Pages URL and find the answer to all three exec-driven questions without guidance — on any device
3. Ask "walk me through your pipeline" and receive a confident, specific answer about the NO_RESEP parsing logic, star schema design, and JSON export step
4. Ask "what would you do differently with more data?" and receive a thoughtful answer (see Limitations table above)
