CREATE SCHEMA IF NOT EXISTS staging;

DROP TABLE IF EXISTS staging.det_sales_raw;
CREATE TABLE staging.det_sales_raw (
    NO_RESEP  varchar(20) NOT NULL,
    KD_OBAT   varchar(20) NOT NULL,
    QTY       double precision NOT NULL,
    HNA       double precision NOT NULL,
    HJ        double precision NOT NULL,
    PPN_JUAL  real NOT NULL
);
CREATE INDEX idx_det_sales_raw_no_resep ON staging.det_sales_raw (NO_RESEP);

DROP TABLE IF EXISTS staging.ms_product_raw;
CREATE TABLE staging.ms_product_raw (
    KD_OBAT   varchar(20) NOT NULL,
    NAMA      varchar(50) NOT NULL,
    SAT_JUAL  varchar(10) NOT NULL,
    KD_PABRIK varchar(10) NOT NULL,
    HJ_RP     double precision NOT NULL
);

DROP TABLE IF EXISTS staging.ms_sales_raw;
CREATE TABLE staging.ms_sales_raw (
    NO_RESEP  varchar(20) NOT NULL,
    TGL       date NOT NULL,
    KD_CUST   varchar(25) NOT NULL,
    KD_DOKTER varchar(15) NOT NULL,
    REG_AS    char(1),
    JAM_JUAL  time,
    RACIK     char(1)
);

DROP TABLE IF EXISTS staging.transaction_raw;
CREATE TABLE staging.transaction_raw (
    NO_RESEP  varchar(20) NOT NULL,
    TGL       date,
    KD_CUST   varchar(25) NOT NULL,
    KD_OBAT   varchar(20) NOT NULL,
    QTY       double precision NOT NULL,
    HNA       double precision NOT NULL,
    HJ        double precision NOT NULL
);
