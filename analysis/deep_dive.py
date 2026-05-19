"""
deep_dive.py
Deep dive analysis using North Star method — Phase 3.
Answer exec-driven questions with quantified findings.

Exec-Driven Questions:
1. Which product categories and transaction channels drive the most revenue and 
   gross margin — and how does the mix shift month by month?
2. Where is margin compression risk — high-volume products with dangerously thin margins?
3. How does generic vs branded medicine performance differ across inpatient and 
   outpatient channels?
"""

import psycopg2
import pandas as pd
from pathlib import Path

DB_CONFIG = {
    "host": "localhost", "port": 5433,
    "dbname": "db_pharmacy", "user": "postgres", "password": "admin",
}

OUTPUT_DIR = Path(__file__).resolve().parent / "summaries"


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def ensure_output_dir():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def query_to_df(query):
    conn = get_connection()
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df


def analyze_monthly_revenue_trend():
    """
    Task 3.1: Monthly revenue trend + mix shift analysis
    Which product categories and transaction channels drive the most revenue and 
    gross margin — and how does the mix shift month by month?
    """
    query = """
        SELECT 
            dd.year_month,
            dd.month_name,
            dt.transaction_type,
            SUM(fs.revenue) as revenue,
            SUM(fs.gross_margin) as gross_margin,
            AVG(fs.margin_pct) as avg_margin_pct,
            COUNT(*) as transaction_lines
        FROM fact_sales fs
        JOIN dim_date dd ON fs.date_key = dd.date_key
        JOIN dim_transaction dt ON fs.no_resep = dt.no_resep
        WHERE dd.year_month IS NOT NULL
        GROUP BY dd.year_month, dd.month_name, dt.transaction_type
        ORDER BY dd.year_month, dt.transaction_type;
    """
    df = query_to_df(query)
    return df


def analyze_revenue_decomposition():
    """
    Task 3.2: Decompose revenue = txn count × avg revenue/txn
    Identify whether volume or value is driving monthly movement.
    """
    query = """
        SELECT 
            dd.year_month,
            dd.month_name,
            dt.transaction_type,
            COUNT(DISTINCT fs.no_resep) as transaction_count,
            SUM(fs.revenue) as total_revenue,
            SUM(fs.revenue)::numeric / COUNT(DISTINCT fs.no_resep) as avg_revenue_per_txn,
            COUNT(*) as line_items
        FROM fact_sales fs
        JOIN dim_date dd ON fs.date_key = dd.date_key
        JOIN dim_transaction dt ON fs.no_resep = dt.no_resep
        WHERE dd.year_month IS NOT NULL
        GROUP BY dd.year_month, dd.month_name, dt.transaction_type
        ORDER BY dd.year_month, dt.transaction_type;
    """
    df = query_to_df(query)
    return df


def analyze_margin_by_sku():
    """
    Task 3.3: Margin % by SKU, rank by revenue volume
    Identify compression risk SKUs.
    """
    query = """
        SELECT 
            dp.kd_obat,
            dp.product_type,
            dp.price_tier,
            SUM(fs.revenue) as total_revenue,
            SUM(fs.gross_margin) as total_gross_margin,
            AVG(fs.margin_pct) as avg_margin_pct,
            COUNT(*) as transaction_lines,
            COUNT(DISTINCT fs.no_resep) as unique_transactions
        FROM fact_sales fs
        JOIN dim_product dp ON fs.kd_obat = dp.kd_obat
        WHERE fs.margin_pct IS NOT NULL
        GROUP BY dp.kd_obat, dp.product_type, dp.price_tier
        ORDER BY total_revenue DESC;
    """
    df = query_to_df(query)
    return df


def analyze_risk_skus_crosscheck():
    """
    Task 3.4: Cross-check risk SKUs: generic/branded, RJ/RI
    Identify high-volume products with dangerously thin margins.
    """
    query = """
        WITH risk_skus as (
            SELECT 
                dp.kd_obat,
                dp.product_type,
                AVG(fs.margin_pct) as avg_margin_pct,
                SUM(fs.revenue) as total_revenue,
                SUM(fs.revenue) as revenue_volume,
                COUNT(DISTINCT fs.no_resep) as txn_count
            FROM fact_sales fs
            JOIN dim_product dp ON fs.kd_obat = dp.kd_obat
            WHERE fs.margin_pct IS NOT NULL AND fs.margin_pct < 10
            GROUP BY dp.kd_obat, dp.product_type
        )
        SELECT 
            rs.kd_obat,
            rs.product_type,
            rs.avg_margin_pct,
            rs.total_revenue,
            rs.revenue_volume,
            rs.txn_count,
            dt.transaction_type,
            COUNT(DISTINCT fs.no_resep) as txn_count_by_channel,
            SUM(fs.revenue) as revenue_by_channel
        FROM risk_skus rs
        JOIN fact_sales fs ON rs.kd_obat = fs.kd_obat
        JOIN dim_transaction dt ON fs.no_resep = dt.no_resep
        GROUP BY rs.kd_obat, rs.product_type, rs.avg_margin_pct, rs.total_revenue, 
                 rs.revenue_volume, rs.txn_count, dt.transaction_type
        ORDER BY rs.total_revenue DESC, dt.transaction_type;
    """
    df = query_to_df(query)
    return df


def analyze_product_transaction_crosstab():
    """
    Task 3.5: 2×2 cross-tab: product type × transaction type
    How does generic vs branded medicine performance differ across 
    inpatient and outpatient channels?
    """
    query = """
        SELECT 
            dp.product_type,
            dt.transaction_type,
            SUM(fs.revenue) as revenue,
            SUM(fs.gross_margin) as gross_margin,
            AVG(fs.margin_pct) as avg_margin_pct,
            COUNT(DISTINCT fs.no_resep) as transaction_count,
            COUNT(*) as line_items,
            SUM(fs.revenue)::numeric / COUNT(DISTINCT fs.no_resep) as avg_revenue_per_txn
        FROM fact_sales fs
        JOIN dim_product dp ON fs.kd_obat = dp.kd_obat
        JOIN dim_transaction dt ON fs.no_resep = dt.no_resep
        WHERE fs.margin_pct IS NOT NULL
        GROUP BY dp.product_type, dt.transaction_type
        ORDER BY dp.product_type, dt.transaction_type;
    """
    df = query_to_df(query)
    return df


def analyze_monthly_stability():
    """
    Task 3.6: Monthly stability check of mix
    Check if the mix is stable across months or shifts seasonally.
    """
    query = """
        SELECT 
            dd.year_month,
            dp.product_type,
            dt.transaction_type,
            SUM(fs.revenue) as revenue,
            SUM(fs.revenue)::numeric / NULLIF(
                SUM(SUM(fs.revenue)) OVER (PARTITION BY dd.year_month), 0
            ) * 100 as revenue_pct_of_month,
            AVG(fs.margin_pct) as avg_margin_pct
        FROM fact_sales fs
        JOIN dim_date dd ON fs.date_key = dd.date_key
        JOIN dim_product dp ON fs.kd_obat = dp.kd_obat
        JOIN dim_transaction dt ON fs.no_resep = dt.no_resep
        WHERE dd.year_month IS NOT NULL AND fs.margin_pct IS NOT NULL
        GROUP BY dd.year_month, dp.product_type, dt.transaction_type
        ORDER BY dd.year_month, dp.product_type, dt.transaction_type;
    """
    df = query_to_df(query)
    return df


def main():
    print("=" * 60)
    print("PHASE 3: DEEP DIVE ANALYSIS - NORTH STAR METHOD")
    print("=" * 60)
    
    ensure_output_dir()
    
    print("\n[3.1] Monthly revenue trend + mix shift analysis...")
    df1 = analyze_monthly_revenue_trend()
    df1.to_csv(OUTPUT_DIR / "monthly_revenue_trend.csv", index=False)
    print(f"  -> Exported {len(df1)} rows to monthly_revenue_trend.csv")

    print("\n[3.2] Revenue decomposition (volume vs value)...")
    df2 = analyze_revenue_decomposition()
    df2.to_csv(OUTPUT_DIR / "revenue_decomposition.csv", index=False)
    print(f"  -> Exported {len(df2)} rows to revenue_decomposition.csv")

    print("\n[3.3] Margin % by SKU (ranked by revenue)...")
    df3 = analyze_margin_by_sku()
    df3.to_csv(OUTPUT_DIR / "margin_by_sku.csv", index=False)
    print(f"  -> Exported {len(df3)} rows to margin_by_sku.csv")

    print("\n[3.4] Risk SKUs cross-check (generic/branded x RJ/RI)...")
    df4 = analyze_risk_skus_crosscheck()
    df4.to_csv(OUTPUT_DIR / "risk_skus_crosscheck.csv", index=False)
    print(f"  -> Exported {len(df4)} rows to risk_skus_crosscheck.csv")

    print("\n[3.5] Product x Transaction cross-tab...")
    df5 = analyze_product_transaction_crosstab()
    df5.to_csv(OUTPUT_DIR / "product_transaction_crosstab.csv", index=False)
    print(f"  -> Exported {len(df5)} rows to product_transaction_crosstab.csv")

    print("\n[3.6] Monthly stability check (mix shift over time)...")
    df6 = analyze_monthly_stability()
    df6.to_csv(OUTPUT_DIR / "monthly_stability.csv", index=False)
    print(f"  -> Exported {len(df6)} rows to monthly_stability.csv")
    
    print("\n" + "=" * 60)
    print("PHASE 3 COMPLETE")
    print("=" * 60)
    print(f"\nAll CSV exports saved to: {OUTPUT_DIR}")
    
    return {
        "monthly_trend": df1,
        "decomposition": df2,
        "margin_by_sku": df3,
        "risk_skus": df4,
        "crosstab": df5,
        "monthly_stability": df6,
    }


if __name__ == "__main__":
    main()