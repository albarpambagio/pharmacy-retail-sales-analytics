# SCAN Framework — C: Columns and Coverage

> **Phase**: 2 — EDA  
> **Purpose**: Document upfront what this dataset *cannot* answer before analysis begins.

---

## Dataset Overview

| Attribute | Value |
|-----------|-------|
| Source | Hospital pharmacy system (MariaDB export), 2015 |
| Data First Accessed | 2026-05-18 |
| Source URL | https://data.mendeley.com/datasets/2ym7v78wtd/1 |
| Volume | ~514,620 transaction lines |
| Date Coverage | 5/12 months (7.6% of rows have valid dates) |

---

## Columns Available

### From Source (staging.det_sales_raw)

| Column | Type | Contents |
|--------|------|----------|
| NO_RESEP | varchar(20) | Prescription number — contains txn type, dept, date |
| KD_OBAT | varchar(20) | Medicine code — AI-* = Generic, R-* = Branded |
| QTY | double | Quantity (can be fractional for liquids/powders) |
| HNA | double | Harga Netto Apotek (net price, excl. VAT) |
| HJ | double | Harga Jual (selling price, excl. VAT) |
| PPN_JUAL | float | VAT percentage (10 for RJ/outpatient, 0 for RI/inpatient) |

### Derived Columns (staging.det_sales_transformed)

| Column | Source | Logic |
|--------|--------|-------|
| txn_type | NO_RESEP | RJ → Outpatient, RI → Inpatient |
| dept_code | NO_RESEP | Characters 3–4 |
| year_month | NO_RESEP | Characters 6–12 (if valid) |
| product_type | KD_OBAT | AI-* → Generic, R-* → Branded |
| price_tier | HJ | Low < 500, Mid < 10K, High < 100K, Premium ≥ 100K |
| revenue | QTY × HJ | Gross revenue per line |
| gross_margin | HJ − HNA | Gross margin per line |
| margin_pct | (HJ − HNA) / HNA × 100 | Margin percentage |

---

## What This Dataset CAN Answer

| Question | Data Support |
|----------|---------------|
| Which product types generate most revenue? | ✅ Complete — Generic 70.3%, Branded 29.7% |
| What is the margin distribution across SKUs? | ✅ Complete — 2,230 SKUs with margin data |
| How do inpatient vs outpatient compare? | ✅ Complete — RJ 63.8%, RI 28.7% |
| Which SKUs are at risk (below 10% margin)? | ✅ Complete — 23 SKUs identified |
| What is the top 20 SKU concentration? | ✅ Complete — 35.6% of revenue in top 20 |
| How does product mix vary by channel? | ✅ Complete — 2×2 cross-tab available |

---

## What This Dataset CANNOT Answer

### 1. Year-over-Year Comparison

- **Limitation**: Single year (2015) only
- **Impact**: Cannot identify YoY trends or growth patterns
- **Mitigation**: Use monthly granularity (12 data points) for trend analysis within 2015

### 2. Patient Demographics

- **Limitation**: No patient age, gender, or diagnosis data
- **Impact**: Cannot segment by patient demographics or clinical conditions
- **Mitigation**: Revenue analysis is sufficient for procurement decisions; clinical segmentation would require separate data request

### 3. Competitor Pricing

- **Limitation**: No external market pricing data
- **Impact**: Cannot benchmark margins against competitors
- **Mitigation**: Focus on internal margin optimization rather than external positioning

### 4. Stock/Inventory Levels

- **Limitation**: No inventory or stockout data
- **Impact**: Cannot calculate stockout risk or optimal reorder points
- **Mitigation**: Recommend inventory data as next data request for procurement planning

### 5. Supplier Information

- **Limitation**: No supplier metadata (supplier name, contract terms, lead times)
- **Impact**: Cannot attribute SKU performance to specific suppliers
- **Mitigation**: Focus on SKU-level analysis; supplier attribution requires procurement system data

### 6. Exact Transaction Dates

- **Limitation**: 92.4% of rows have no valid date (irregular NO_RESEP format)
- **Impact**: Monthly trend analysis limited to 5 months of data
- **Mitigation**: Clearly communicate data coverage in dashboard; prioritize fixing source system date format

### 7. Geographic/Store Segmentation

- **Limitation**: Single pharmacy location only
- **Impact**: Cannot compare performance across stores or regions
- **Mitigation**: Findings need validation across other outlets before scaling recommendations

### 8. Cost of Goods Sold (COGS)

- **Limitation**: HNA (net price) is not true COGS — includes pharmacy margin
- **Impact**: Cannot calculate true product-level profitability
- **Mitigation**: Use gross margin (HJ − HNA) as proxy; request true supplier cost data for accurate profitability

---

## Data Quality Summary

| Issue | Count | % of Total | Impact |
|-------|-------|------------|--------|
| Irregular NO_RESEP (no date) | 475,574 | 92.4% | Monthly trends limited |
| Unknown transaction type | 29,309 | 5.7% | RJ/RI analysis incomplete |
| Negative margin (HJ < HNA) | 1,347 | 0.3% | Flagged but retained |
| Zero/negative QTY | 284 | <0.1% | Excluded from fact_sales |
| HNA = 0 (no cost) | 64 | <0.1% | margin_pct = NULL |

---

## Implications for Analysis

1. **Monthly trends are indicative, not comprehensive** — Only 7.6% of data has valid dates
2. **Margin analysis is accurate for remaining 99%+** — Negative margins and zero-QTY rows are properly flagged
3. **Channel analysis covers ~92% of revenue** — Unknown transaction type affects 7.5% of revenue
4. **SKU-level analysis is complete** — All 2,233 SKUs classified with product type and price tier

---

## Recommendations for Next Data Request

To enable more complete analysis, request from pharmacy operations:

1. **Full date in transaction ID** — Fix NO_RESEP format to standard (RJ-XX.YYYY-MM-SSSS)
2. **Patient demographics** — Age, gender, ward (for clinical segmentation)
3. **Supplier metadata** — Supplier name, contract terms, lead times
4. **Inventory levels** — Stock on hand, reorder points, stockout events
5. **Multiple years** — 2016+ data for YoY comparison
6. **Multiple locations** — If pharmacy has branches

---

## Documentation Metadata

| Field | Value |
|-------|-------|
| Created | 2026-05-19 |
| Framework Step | C — Columns and Coverage |
| Phase | 2 — EDA |
| Owner | Analytics Team |