"""
config.py
Centralized configuration for ETL pipeline.
All database and pipeline settings in one place.
"""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "dbname": "db_pharmacy",
    "user": "postgres",
    "password": "admin",
}

LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True, parents=True)

SCHEMA_SQL_PATH = PROJECT_ROOT / "sql" / "02_create_star_schema.sql"

BATCH_ID_FORMAT = "%Y%m%d-%H%M%S"


def generate_batch_id():
    from datetime import datetime
    return datetime.now().strftime(BATCH_ID_FORMAT)


def get_log_path(name: str) -> Path:
    return LOG_DIR / f"{name}.log"