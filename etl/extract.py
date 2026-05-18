"""
extract.py
Read raw data from staging.det_sales_raw, validate, log statistics.
Output: pandas DataFrame (returned, not persisted — next script reads from DB).
"""

import psycopg2
import pandas as pd
from pathlib import Path

DB_CONFIG = {
    "host": "localhost", "port": 5433,
    "dbname": "db_pharmacy", "user": "postgres", "password": "admin",
}

LOG_PATH = Path(__file__).resolve().parent.parent / "logs" / "extract.log"


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    query = "SELECT * FROM staging.det_sales_raw;"
    df = pd.read_sql_query(query, conn)
    conn.close()

    total = len(df)
    qty_le_zero = (df["qty"] <= 0).sum()
    hj_lt_hna = (df["hj"] < df["hna"]).sum()
    nulls = df.isnull().sum().sum()

    log_lines = [
        f"extract.py — {pd.Timestamp.now()}",
        f"  Rows extracted:  {total}",
        f"  QTY <= 0:        {qty_le_zero}",
        f"  HJ < HNA:        {hj_lt_hna}",
        f"  Null values:     {nulls}",
        f"  Columns:         {list(df.columns)}",
        f"  HJ range:        {df['hj'].min():.2f} — {df['hj'].max():.2f}",
        f"  HNA range:       {df['hna'].min():.2f} — {df['hna'].max():.2f}",
        f"  PPN_JUAL values: {sorted(df['ppn_jual'].unique())}",
        "",
    ]
    print("\n".join(log_lines))

    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("\n".join(log_lines), encoding="utf-8")

    return df


if __name__ == "__main__":
    main()
