"""
extract.py
Validate raw staging data — read from staging.det_sales_raw, log statistics.
This script does NOT load data (already loaded by convert_and_load.py).
"""

import psycopg2
import pandas as pd
from config import DB_CONFIG, get_log_path

LOG_PATH = get_log_path("extract")


def main():
    try:
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

    except Exception as e:
        log_lines = [
            f"extract.py — ERROR: {pd.Timestamp.now()}",
            f"  {type(e).__name__}: {e}",
        ]
        print("\n".join(log_lines))
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        LOG_PATH.write_text("\n".join(log_lines), encoding="utf-8")
        raise


if __name__ == "__main__":
    main()
