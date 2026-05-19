DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS dim_transaction;
DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS dim_date;

CREATE TABLE dim_date (
    date_key    integer PRIMARY KEY,
    year_month  varchar(7) NOT NULL UNIQUE,
    month_num   integer NOT NULL CHECK (month_num BETWEEN 1 AND 12),
    month_name  varchar(20) NOT NULL,
    year        integer NOT NULL
);

CREATE TABLE dim_transaction (
    no_resep        varchar(20) PRIMARY KEY,
    transaction_type varchar(20) NOT NULL,
    dept_code       varchar(5) NOT NULL
);

CREATE TABLE dim_product (
    kd_obat      varchar(20) PRIMARY KEY,
    product_type varchar(20) NOT NULL,
    price_tier   varchar(20) NOT NULL
);

CREATE TABLE fact_sales (
    fact_id         serial PRIMARY KEY,
    no_resep        varchar(20) NOT NULL REFERENCES dim_transaction(no_resep),
    kd_obat         varchar(20) NOT NULL REFERENCES dim_product(kd_obat),
    date_key        integer REFERENCES dim_date(date_key),
    qty             double precision NOT NULL,
    hna             double precision NOT NULL,
    hj              double precision NOT NULL,
    ppn_jual        real NOT NULL,
    revenue         double precision NOT NULL,
    gross_margin    double precision NOT NULL,
    margin_pct      double precision,
    tax_inclusive   integer NOT NULL DEFAULT 0,
    flag_hj_lt_hna  boolean NOT NULL DEFAULT false,
    flag_qty_le_zero boolean NOT NULL DEFAULT false,
    etl_batch_id    varchar(20),
    loaded_at       timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_sales_date     ON fact_sales(date_key);
CREATE INDEX idx_fact_sales_no_resep ON fact_sales(no_resep);
CREATE INDEX idx_fact_sales_kd_obat  ON fact_sales(kd_obat);
CREATE INDEX idx_fact_sales_batch    ON fact_sales(etl_batch_id);

CREATE SCHEMA IF NOT EXISTS etl;

CREATE TABLE IF NOT EXISTS etl.lineage (
    batch_id        varchar(20) PRIMARY KEY,
    run_start       timestamp NOT NULL DEFAULT NOW(),
    run_end         timestamp,
    source_rows     integer,
    transformed_rows integer,
    fact_rows_loaded integer,
    issues_log      jsonb,
    status          varchar(20) NOT NULL DEFAULT 'RUNNING'
);

CREATE INDEX IF NOT EXISTS idx_lineage_status ON etl.lineage(status);
