# Data Understanding: Pharmacy Retail Sales Dataset

## Project Overview

| Attribute | Value |
|-----------|-------|
| **Project** | Retail Sales Analytics |
| **Source** | Hospital/Pharmacy System (MariaDB) |
| **Data First Accessed** | 2026-05-18 |
| **Source URL** | https://data.mendeley.com/datasets/2ym7v78wtd/1 |
| **Date Range** | 2015 |
| **Location** | `docs/data/sales.sql` |

---

## 1. Main Table: `det_sales`

### Table Overview

| Attribute | Value |
|-----------|-------|
| **Table Name** | `det_sales` (Detail Sales) |
| **Database** | `db_pharmacy` |
| **Est. Row Count** | ~511,559 rows |

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `NO_RESEP` | varchar(20) | Prescription/Transaction number |
| `KD_OBAT` | varchar(20) | Medicine product code |
| `QTY` | double | Quantity sold |
| `HNA` | double | Net purchase price (before tax) |
| `HJ` | double | Selling price (incl. margin, excl. PPN) |
| `PPN_JUAL` | float | VAT/tax rate (0% or 10%) |

---

## 2. Transaction Type Classification

Based on `NO_RESEP` prefix:

| Prefix | Description | Meaning | Typical Tax |
|--------|-------------|---------|-------------|
| `RJ-` | Rawat Jalan | Outpatient | 10% |
| `RI-` | Rawat Inap | Inpatient | 0% |

### Pattern: `RJ-01.2015-08-0001`
- Prefix: Transaction type
- `01`: Department/code
- `2015-08`: Year-Month
- `0001`: Sequential counter

---

## 3. Product Classification

Based on `KD_OBAT` prefix:

| Prefix | Description | Example Products |
|--------|-------------|------------------|
| `AI-` | Generic medicines | AI-1157, AI-1220 |
| `R-` | Branded/ethical medicines | R-1115, R-1561 |

---

## 4. Key Metrics for Analysis

### Revenue Calculation
```
Revenue = QTY × HJ
```

### Gross Margin (per line item)
```
Margin = HJ - HNA
```

### Margin Percentage
```
Margin % = ((HJ - HNA) / HNA) × 100
```

### Tax Handling
- `PPN_JUAL = 10`: Price includes 10% VAT
- `PPN_JUAL = 0`: No VAT applied (inpatient)

---

## 5. Price Distribution Observations

| Category | Range (IDR) |
|----------|-------------|
| Low-cost items | ~20 - 500 |
| Mid-range medicines | ~500 - 10,000 |
| High-value drugs | ~10,000 - 100,000 |
| Premium medicines | 100,000+ |

---

## 6. Data Quality Notes

- **No null values** observed in sample
- **QTY can be fractional** (e.g., 2.5 units)
- **Price precision**: Up to 3 decimal places
- **Transaction completeness**: Multiple products per prescription

---

## 7. Potential Joins

If additional tables exist, likely relationships:

| Source Table | Join Key | Relationship |
|-------------|----------|--------------|
| `dim_obat` (medicine master) | `KD_OBAT` | 1:N |
| `dim_pasien` (patient) | `NO_RESEP` | 1:N |
| `dim_waktu` (date) | Extracted from `NO_RESEP` | 1:N |

---

## Summary

This pharmacy sales dataset captures ~511K drug dispensing transactions from a hospital pharmacy system in 2015. The data allows for:
- Revenue analysis by transaction type (inpatient vs outpatient)
- Product performance analysis (generic vs branded)
- Margin analysis across product categories
- Tax compliance verification