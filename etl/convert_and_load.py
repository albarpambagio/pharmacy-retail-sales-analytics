"""
convert_and_load.py
Read MariaDB dump (sales.sql), convert syntax to PostgreSQL, load into staging.
Handles 4 tables: det_sales, ms_product, ms_sales, transaction.
One-time setup script — not part of the daily ETL pipeline.
"""

import re
import sys
from datetime import datetime
import psycopg2
from pathlib import Path
from config import DB_CONFIG, get_log_path

DUMP_PATH = Path(__file__).resolve().parent.parent / "docs" / "data" / "temp" / "sales.sql"
LOG_PATH = get_log_path("convert_and_load")

TABLE_MAP = {
    "det_sales": "staging.det_sales_raw",
    "ms_product": "staging.ms_product_raw",
    "ms_sales": "staging.ms_sales_raw",
    "transaction": "staging.transaction_raw",
}

BACKTICK_RE = re.compile(r'`([^`]+)`')

ESCAPE_MAP = {
    "\\\\": "\\",
    "\\'": "''",
    '\\"': '"',
    "\\n": "\n",
    "\\r": "\r",
    "\\0": "\0",
    "\\Z": "\x1a",
}


def fix_mysql_escapes(stmt: str) -> str:
    for old, new in ESCAPE_MAP.items():
        stmt = stmt.replace(old, new)
    return stmt


def convert_insert(stmt: str) -> str | None:
    stmt = stmt.strip()
    if not stmt.upper().startswith("INSERT INTO"):
        return None

    m = re.match(r"INSERT INTO `(det_sales|ms_product|ms_sales|transaction)`", stmt)
    if not m:
        return None

    tbl = m.group(1)
    pgtbl = TABLE_MAP[tbl]

    cleaned = BACKTICK_RE.sub(r"\1", stmt)
    cleaned = cleaned.replace(f"INSERT INTO {tbl} ", f"INSERT INTO {pgtbl} ", 1)
    cleaned = fix_mysql_escapes(cleaned)
    cleaned = cleaned.rstrip(",")
    if not cleaned.endswith(";"):
        cleaned += ";"

    return cleaned


def main():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        cur = conn.cursor()

        for tbl in TABLE_MAP.values():
            cur.execute(f"TRUNCATE TABLE {tbl};")
        conn.commit()

        with open(DUMP_PATH, "r", encoding="utf-8", errors="replace") as f:
            raw = f.read()

        statements = raw.split(";\n")

        batch = []
        total = 0
        table_counts = {t: 0 for t in TABLE_MAP}

        for stmt in statements:
            converted = convert_insert(stmt)
            if converted is None:
                continue

            tbl = re.search(r"INSERT INTO staging\.(\w+)_raw ", converted).group(1)
            table_counts[tbl] += 1

            values_match = re.search(r"VALUES\s*(.*)", converted, re.DOTALL)
            if values_match:
                values_str = values_match.group(1).strip().rstrip(";").strip()
                row_count = values_str.count("),") + 1 if values_str.startswith("(") else 0
            else:
                row_count = 0

            total += row_count
            batch.append(converted)

            if len(batch) >= 10:
                for s in batch:
                    cur.execute(s)
                conn.commit()
                batch = []

        if batch:
            for s in batch:
                cur.execute(s)
            conn.commit()

        cur.close()
        conn.close()

        log_lines = [
            f"convert_and_load.py — {datetime.now()}",
            f"  Total rows loaded: {total}",
        ]
        for tbl, stmt_count in table_counts.items():
            log_lines.append(f"  {tbl}: {stmt_count} INSERT statements")
        log_lines.append("")

        print("\n".join(log_lines))
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        LOG_PATH.write_text("\n".join(log_lines), encoding="utf-8")

    except Exception as e:
        log_lines = [
            f"convert_and_load.py — ERROR: {datetime.now()}",
            f"  {type(e).__name__}: {e}",
        ]
        print("\n".join(log_lines))
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        LOG_PATH.write_text("\n".join(log_lines), encoding="utf-8")
        raise


if __name__ == "__main__":
    main()
