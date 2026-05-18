"""
load.py
Read transformed data, build star schema in PostgreSQL.
Populates: dim_date, dim_transaction, dim_product, fact_sales.
"""

import psycopg2
import pandas as pd
import numpy as np
from pathlib import Path

DB_CONFIG = {
    "host": "localhost", "port": 5433,
    "dbname": "db_pharmacy", "user": "postgres", "password": "admin",
}

LOG_PATH = Path(__file__).resolve().parent.parent / "logs" / "load.log"
SCHEMA_SQL_PATH = Path(__file__).resolve().parent.parent / "sql" / "02_create_star_schema.sql"


def create_schema_tables(conn):
    sql = SCHEMA_SQL_PATH.read_text(encoding="utf-8")
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    cur.close()


def populate_dim_date(conn):
    months = [
        (201501, "2015-01", 1, "January", 2015),
        (201502, "2015-02", 2, "February", 2015),
        (201503, "2015-03", 3, "March", 2015),
        (201504, "2015-04", 4, "April", 2015),
        (201505, "2015-05", 5, "May", 2015),
        (201506, "2015-06", 6, "June", 2015),
        (201507, "2015-07", 7, "July", 2015),
        (201508, "2015-08", 8, "August", 2015),
        (201509, "2015-09", 9, "September", 2015),
        (201510, "2015-10", 10, "October", 2015),
        (201511, "2015-11", 11, "November", 2015),
        (201512, "2015-12", 12, "December", 2015),
    ]
    cur = conn.cursor()
    cur.executemany(
        "INSERT INTO dim_date (date_key, year_month, month_num, month_name, year) VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING;",
        months,
    )
    conn.commit()
    cur.close()


def populate_dim_transaction(conn, df: pd.DataFrame):
    distinct = df[["no_resep", "txn_type", "dept_code"]].drop_duplicates(subset="no_resep")
    cur = conn.cursor()
    rows = [(r["no_resep"], r["txn_type"], r["dept_code"]) for _, r in distinct.iterrows()]
    cur.executemany(
        "INSERT INTO dim_transaction (no_resep, transaction_type, dept_code) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING;",
        rows,
    )
    conn.commit()
    cur.close()


def populate_dim_product(conn, df: pd.DataFrame):
    distinct = df[["kd_obat", "product_type", "price_tier"]].drop_duplicates(subset="kd_obat")
    cur = conn.cursor()
    rows = [(r["kd_obat"], r["product_type"], r["price_tier"]) for _, r in distinct.iterrows()]
    cur.executemany(
        "INSERT INTO dim_product (kd_obat, product_type, price_tier) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING;",
        rows,
    )
    conn.commit()
    cur.close()


def date_key_from_ym(ym):
    if pd.isna(ym):
        return None
    try:
        parts = str(ym).split("-")
        month = int(parts[1])
        if month < 1 or month > 12:
            return None
        return int(parts[0] + parts[1])
    except (ValueError, IndexError):
        return None


def populate_fact_sales(conn, df: pd.DataFrame):
    df = df[df["flag_qty_le_zero"] == False].copy()
    cur = conn.cursor()
    rows = []
    for _, r in df.iterrows():
        dk = date_key_from_ym(r["year_month"])
        rows.append((
            r["no_resep"], r["kd_obat"], dk,
            float(r["qty"]), float(r["hna"]), float(r["hj"]), float(r["ppn_jual"]),
            float(r["revenue"]), float(r["gross_margin"]),
            None if (r["margin_pct"] is None or (isinstance(r["margin_pct"], float) and np.isnan(r["margin_pct"]))) else float(r["margin_pct"]),
            int(r["tax_inclusive"]),
            bool(r["flag_hj_lt_hna"]), bool(r["flag_qty_le_zero"]),
        ))

    cur.executemany(
        """
        INSERT INTO fact_sales
        (no_resep, kd_obat, date_key, qty, hna, hj, ppn_jual,
         revenue, gross_margin, margin_pct, tax_inclusive,
         flag_hj_lt_hna, flag_qty_le_zero)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        rows,
    )
    conn.commit()
    cur.close()


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    df = pd.read_sql_query("SELECT * FROM staging.det_sales_transformed;", conn)

    create_schema_tables(conn)
    populate_dim_date(conn)
    populate_dim_transaction(conn, df)
    populate_dim_product(conn, df)
    populate_fact_sales(conn, df)

    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM dim_date;")
    dim_date_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM dim_transaction;")
    dim_txn_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM dim_product;")
    dim_prod_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM fact_sales;")
    fact_count = cur.fetchone()[0]
    cur.close()
    conn.close()

    log_lines = [
        f"load.py — {pd.Timestamp.now()}",
        f"  dim_date:         {dim_date_count} rows",
        f"  dim_transaction:  {dim_txn_count} rows",
        f"  dim_product:      {dim_prod_count} rows",
        f"  fact_sales:       {fact_count} rows",
        f"  Input rows:       {len(df)}",
        "",
    ]
    print("\n".join(log_lines))
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("\n".join(log_lines), encoding="utf-8")


if __name__ == "__main__":
    main()
