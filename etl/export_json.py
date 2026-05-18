"""
export_json.py
Query star schema, export static JSON files for the dashboard.
Output: dashboard/public/data/{overview,products,margin_risk}.json
"""

import json
import psycopg2
import psycopg2.extras
import pandas as pd
from pathlib import Path

DB_CONFIG = {
    "host": "localhost", "port": 5433,
    "dbname": "db_pharmacy", "user": "postgres", "password": "admin",
}

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "dashboard" / "public" / "data"


def query_dict(conn, sql: str) -> list[dict]:
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(sql)
    rows = cur.fetchall()
    cur.close()
    return [dict(r) for r in rows]


def export_overview(conn) -> dict:
    monthly_revenue = query_dict(conn, """
        SELECT
            d.year_month,
            SUM(f.revenue)::float AS revenue,
            COUNT(*)::int AS transactions,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            SUM(f.revenue) FILTER (WHERE t.transaction_type = 'RJ')::float AS revenue_rj,
            SUM(f.revenue) FILTER (WHERE t.transaction_type = 'RI')::float AS revenue_ri
        FROM fact_sales f
        JOIN dim_date d ON f.date_key = d.date_key
        JOIN dim_transaction t ON f.no_resep = t.no_resep
        WHERE f.flag_qty_le_zero = false
        GROUP BY d.year_month
        ORDER BY d.year_month;
    """)

    total_revenue = sum(r["revenue"] for r in monthly_revenue)
    total_txns = sum(r["transactions"] for r in monthly_revenue)
    avg_margin = (
        sum(r["avg_margin_pct"] for r in monthly_revenue if r["avg_margin_pct"])
        / max(len([r for r in monthly_revenue if r["avg_margin_pct"]]), 1)
    )

    return {
        "total_revenue": total_revenue,
        "total_transactions": total_txns,
        "avg_margin_pct": avg_margin,
        "monthly": monthly_revenue,
    }


def export_products(conn) -> dict:
    product_type_revenue = query_dict(conn, """
        SELECT
            p.product_type,
            SUM(f.revenue)::float AS revenue,
            COUNT(*)::int AS transactions,
            AVG(f.margin_pct)::float AS avg_margin_pct
        FROM fact_sales f
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false
        GROUP BY p.product_type;
    """)

    monthly_product_trend = query_dict(conn, """
        SELECT
            d.year_month,
            p.product_type,
            SUM(f.revenue)::float AS revenue,
            COUNT(*)::int AS transactions
        FROM fact_sales f
        JOIN dim_date d ON f.date_key = d.date_key
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false
        GROUP BY d.year_month, p.product_type
        ORDER BY d.year_month, p.product_type;
    """)

    sku_scatter = query_dict(conn, """
        SELECT
            f.kd_obat,
            p.product_type,
            SUM(f.revenue)::float AS revenue,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            SUM(f.qty)::float AS total_qty,
            COUNT(*)::int AS transaction_count
        FROM fact_sales f
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false
        GROUP BY f.kd_obat, p.product_type
        ORDER BY SUM(f.revenue) DESC;
    """)

    top_20 = query_dict(conn, """
        SELECT
            f.kd_obat,
            p.product_type,
            p.price_tier,
            SUM(f.revenue)::float AS revenue,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            SUM(f.qty)::float AS total_qty
        FROM fact_sales f
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false
        GROUP BY f.kd_obat, p.product_type, p.price_tier
        ORDER BY SUM(f.revenue) DESC
        LIMIT 20;
    """)

    return {
        "product_type_revenue": product_type_revenue,
        "monthly_trend": monthly_product_trend,
        "sku_scatter": sku_scatter,
        "top_20": top_20,
    }


def export_margin_risk(conn) -> dict:
    sku_margins = query_dict(conn, """
        SELECT
            f.kd_obat,
            p.product_type,
            SUM(f.qty)::float AS total_qty,
            SUM(f.revenue)::float AS revenue,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            AVG(f.hna)::float AS avg_hna,
            AVG(f.hj)::float AS avg_hj
        FROM fact_sales f
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false
        GROUP BY f.kd_obat, p.product_type
        ORDER BY AVG(f.margin_pct) ASC;
    """)

    margin_pcts = [s["avg_margin_pct"] for s in sku_margins if s["avg_margin_pct"] is not None]
    if margin_pcts:
        min_m, max_m = min(margin_pcts), max(margin_pcts)
        bin_count = 30
        bin_width = (max_m - min_m) / bin_count if bin_count > 0 else 1
        histogram = []
        for i in range(bin_count):
            lo = min_m + i * bin_width
            hi = lo + bin_width
            count = sum(1 for m in margin_pcts if lo <= m < hi)
            histogram.append({"bin_start": lo, "bin_end": hi, "count": count})
    else:
        histogram = []

    return {
        "skus": sku_margins,
        "histogram": histogram,
        "min_margin": min(margin_pcts) if margin_pcts else 0,
        "max_margin": max(margin_pcts) if margin_pcts else 0,
    }


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = psycopg2.connect(**DB_CONFIG)

    print("Exporting overview.json...")
    overview = export_overview(conn)
    (OUTPUT_DIR / "overview.json").write_text(json.dumps(overview, indent=2), encoding="utf-8")

    print("Exporting products.json...")
    products = export_products(conn)
    (OUTPUT_DIR / "products.json").write_text(json.dumps(products, indent=2), encoding="utf-8")

    print("Exporting margin_risk.json...")
    margin_risk = export_margin_risk(conn)
    (OUTPUT_DIR / "margin_risk.json").write_text(json.dumps(margin_risk, indent=2), encoding="utf-8")

    conn.close()
    print("Done. Files written to:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
