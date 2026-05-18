"""
transform.py
Parse NO_RESEP, classify KD_OBAT, calculate revenue/margin, assign price tiers.
Reads from staging.det_sales_raw, writes to staging.det_sales_transformed.
"""

import re
import psycopg2
import pandas as pd
import numpy as np
from pathlib import Path

DB_CONFIG = {
    "host": "localhost", "port": 5433,
    "dbname": "db_pharmacy", "user": "postgres", "password": "admin",
}

LOG_PATH = Path(__file__).resolve().parent.parent / "logs" / "transform.log"

NO_RESEP_RE = re.compile(r"^(RJ|RI)-(\d{2})\.(\d{4}-\d{2})-(\d+)$")


def _valid_month(ym):
    if pd.isna(ym):
        return False
    try:
        m = int(str(ym).split("-")[1])
        return 1 <= m <= 12
    except (ValueError, IndexError):
        return False


def parse_no_resep(df: pd.DataFrame) -> pd.DataFrame:
    parsed = df["no_resep"].str.extract(NO_RESEP_RE, expand=True)
    parsed.columns = ["txn_type", "dept_code", "year_month", "seq_no"]

    irregular_mask = parsed["txn_type"].isna()
    if irregular_mask.any():
        fallback = df.loc[irregular_mask, "no_resep"].str.extract(
            r"^(RJ|RI)-(\d{2})\.", expand=True
        )
        parsed.loc[irregular_mask, "txn_type"] = fallback[0]
        parsed.loc[irregular_mask, "dept_code"] = fallback[1]
        parsed.loc[irregular_mask, "year_month"] = None

    invalid_month_mask = ~parsed["year_month"].apply(_valid_month)
    parsed.loc[invalid_month_mask, "year_month"] = None
    irregular_mask = irregular_mask | invalid_month_mask

    df["txn_type"] = parsed["txn_type"].fillna("Unknown")
    df["dept_code"] = parsed["dept_code"].fillna("00")
    df["year_month"] = parsed["year_month"]
    df["seq_no"] = parsed["seq_no"]
    df["irregular"] = irregular_mask
    return df


def classify_product(df: pd.DataFrame) -> pd.DataFrame:
    def _classify(kd):
        if pd.isna(kd):
            return "Other"
        s = str(kd).strip().upper()
        if s.startswith("AI-"):
            return "Generic"
        if s.startswith("R-"):
            return "Branded"
        return "Other"

    df["product_type"] = df["kd_obat"].apply(_classify)
    return df


def calculate_metrics(df: pd.DataFrame) -> pd.DataFrame:
    df["revenue"] = df["qty"] * df["hj"]
    df["gross_margin"] = df["hj"] - df["hna"]
    df["margin_pct"] = np.where(
        df["hna"] != 0,
        ((df["hj"] - df["hna"]) / df["hna"]) * 100,
        np.nan,
    )
    df["tax_inclusive"] = (df["ppn_jual"] == 10).astype(int)
    return df


def assign_price_tier(df: pd.DataFrame) -> pd.DataFrame:
    def _tier(hj):
        if hj < 500:
            return "Low"
        elif hj < 10_000:
            return "Mid"
        elif hj < 100_000:
            return "High"
        else:
            return "Premium"

    df["price_tier"] = df["hj"].apply(_tier)
    return df


def flag_quality_issues(df: pd.DataFrame) -> pd.DataFrame:
    df["flag_hj_lt_hna"] = df["hj"] < df["hna"]
    df["flag_qty_le_zero"] = df["qty"] <= 0
    df["flag_unrecognized_prefix"] = ~df["kd_obat"].str.match(
        r"^(AI-|R-)", na=False
    )
    return df


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    raw = pd.read_sql_query("SELECT * FROM staging.det_sales_raw;", conn)

    df = raw.copy()
    df = parse_no_resep(df)
    df = classify_product(df)
    df = calculate_metrics(df)
    df = assign_price_tier(df)
    df = flag_quality_issues(df)

    irreg_count = df["irregular"].sum()
    flagged_counts = {
        "hj_lt_hna": df["flag_hj_lt_hna"].sum(),
        "qty_le_zero": df["flag_qty_le_zero"].sum(),
        "unrecognized_prefix": df["flag_unrecognized_prefix"].sum(),
    }
    product_type_counts = df["product_type"].value_counts().to_dict()
    price_tier_counts = df["price_tier"].value_counts().to_dict()
    txn_type_counts = df["txn_type"].value_counts().to_dict()

    cur.execute("DROP TABLE IF EXISTS staging.det_sales_transformed;")
    cur.execute(
        """
        CREATE TABLE staging.det_sales_transformed (
            no_resep               varchar(20),
            kd_obat                varchar(20),
            qty                    double precision,
            hna                    double precision,
            hj                     double precision,
            ppn_jual               real,
            txn_type               varchar(20),
            dept_code              varchar(5),
            year_month             varchar(7),
            seq_no                 varchar(10),
            irregular              boolean,
            product_type           varchar(20),
            price_tier             varchar(20),
            revenue                double precision,
            gross_margin           double precision,
            margin_pct             double precision,
            tax_inclusive          integer,
            flag_hj_lt_hna         boolean,
            flag_qty_le_zero       boolean,
            flag_unrecognized_prefix boolean
        );
        """
    )
    conn.commit()

    rows_to_insert = []
    for _, r in df.iterrows():
        rows_to_insert.append((
            r["no_resep"], r["kd_obat"], r["qty"], r["hna"], r["hj"], r["ppn_jual"],
            r["txn_type"], r["dept_code"],
            None if pd.isna(r["year_month"]) else r["year_month"],
            r["seq_no"], bool(r["irregular"]),
            r["product_type"], r["price_tier"],
            r["revenue"], r["gross_margin"],
            None if np.isnan(r["margin_pct"]) else r["margin_pct"],
            int(r["tax_inclusive"]),
            bool(r["flag_hj_lt_hna"]),
            bool(r["flag_qty_le_zero"]),
            bool(r["flag_unrecognized_prefix"]),
        ))

    insert_sql = """
        INSERT INTO staging.det_sales_transformed
        (no_resep, kd_obat, qty, hna, hj, ppn_jual,
         txn_type, dept_code, year_month, seq_no, irregular,
         product_type, price_tier,
         revenue, gross_margin, margin_pct, tax_inclusive,
         flag_hj_lt_hna, flag_qty_le_zero, flag_unrecognized_prefix)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    for row in rows_to_insert:
        cur.execute(insert_sql, row)
    conn.commit()

    cur.close()
    conn.close()

    log_lines = [
        f"transform.py — {pd.Timestamp.now()}",
        f"  Rows transformed:  {len(df)}",
        f"  Irregular NO_RESEP: {irreg_count}",
        f"  Product types:     {product_type_counts}",
        f"  Price tiers:       {price_tier_counts}",
        f"  Txn types:         {txn_type_counts}",
        f"  Flags:             {flagged_counts}",
        "",
    ]
    print("\n".join(log_lines))
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("\n".join(log_lines), encoding="utf-8")


if __name__ == "__main__":
    main()
