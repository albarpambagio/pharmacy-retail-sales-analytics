# Issues Log — Data Quality Findings

> **Phase**: 1 — ETL Pipeline  
> **Source**: `staging.det_sales_raw` → `staging.det_sales_transformed`  
> **Date**: 2026-05-18

---

## Summary

| Issue | Count | Severity | Status |
|-------|-------|----------|--------|
| Irregular NO_RESEP format | 475,574 (92.4%) | High | Documented — date dimension unavailable for 92% of rows |
| Unknown transaction type | 29,309 (5.7%) | Medium | Classified as 'Unknown', excluded from RJ/RI analysis |
| Negative margin (HJ < HNA) | 1,347 (0.3%) | Medium | Flagged but retained — may indicate special pricing or data entry errors |
| Zero or negative QTY | 284 (<0.1%) | Medium | Excluded from fact_sales revenue calculations |
| Fractional QTY | 2,511 (0.5%) | Low | Retained — valid for liquid/powder medicines |
| HNA = 0 (zero purchase price) | 64 (<0.1%) | Low | margin_pct set to NULL to guard division by zero |
| Unrecognized KD_OBAT prefix | 0 | None | All products have valid AI- or R- prefix |

---

## 1. Irregular NO_RESEP Format

**Count**: 475,574 rows (92.4% of 514,620)

**Expected format**: `RJ-01.2015-08-0001` (txn type, dept, year-month, sequence)

**Observed issues**:

| Pattern | Example | Count | Root Cause |
|---------|---------|-------|------------|
| Invalid month number | `RJ-11.2015-37-0221` | ~440K | NO_RESEP contains non-calendar identifiers (dept codes, batch refs) in the month position |
| Non-standard format | `RI-01.0780`, `RI-01.3706` | ~29K | Abbreviated format missing year-month |
| Unknown prefix (RL-, UM-) | `RL-12.2015-67-0062` | ~6K | Prefixes not matching RJ/RI — possibly export/import or other transaction types |

**Impact**: Rows without a valid date cannot be plotted on monthly trend charts. They still contribute to total revenue, product, and margin calculations.

**Mitigation**: Transaction type and department code are extracted from the raw string even when date is unavailable.

---

## 2. Unknown Transaction Type

**Count**: 29,309 rows (5.7%)

**Details**: These rows have NO_RESEP prefixes other than `RJ-` or `RI-`. The most common non-standard prefix is `RL-` (likely a separate transaction type not documented in the schema).

**Impact**: These rows are classified as `txn_type = 'Unknown'` and excluded from Outpatient vs Inpatient breakdowns.

---

## 3. Negative Margin (HJ < HNA)

**Count**: 1,347 rows (0.3%)

**Details**: Selling price (HJ) is lower than net purchase price (HNA), producing a negative gross margin. This may indicate:
- Promotional pricing below cost
- Data entry errors in HNA or HJ
- Special pricing agreements not captured in the dataset

**Impact**: These rows are flagged (`flag_hj_lt_hna = true`) but retained in all calculations. Excluding them would overstate overall pharmacy profitability.

---

## 4. Zero or Negative Quantity

**Count**: 284 rows (<0.1%)

**Details**: QTY values are zero or negative. Some appear to be correction/void transactions (e.g., a product dispensed with +10 then reversed with -10).

**Impact**: These rows are excluded from `fact_sales` to avoid distorting revenue and margin calculations. The flag `flag_qty_le_zero` is preserved for audit purposes.

---

## 5. Fractional Quantity

**Count**: 2,511 rows (0.5%)

**Details**: Quantities like 2.5, 0.5, etc. These are expected in a pharmacy context — liquids, powders, and compounded medicines are dispensed in fractional units.

**Impact**: None. Fractions are valid and retained as-is.

---

## 6. Zero Purchase Price (HNA = 0)

**Count**: 64 rows (<0.1%)

**Details**: Net purchase price is zero — possibly free samples, complimentary medicines, or data entry gaps.

**Impact**: Margin percentage cannot be calculated (division by zero), so `margin_pct` is set to NULL for these rows. All other calculations remain unaffected.

---

## 7. Unrecognized KD_OBAT Prefix

**Count**: 0 rows

**Details**: Every product code starts with either `AI-` (Generic) or `R-` (Branded/Ethical). No codes were classified as 'Other'.

**Impact**: None.

---

## Actions Taken

| Issue | Resolution |
|-------|------------|
| Irregular NO_RESEP | Parse partial info (txn type, dept), set year_month to NULL |
| Unknown txn type | Classify as 'Unknown', filterable in dashboard |
| Negative margin | Flagged, retained in calculations |
| QTY <= 0 | Excluded from fact_sales |
| Fractional QTY | Retained as-is |
| HNA = 0 | margin_pct set to NULL |
| Unrecognized prefix | None needed |
