"""
eda.py
EDA using SCAN framework -- Phase 2.
Analyze star schema data, generate Plotly charts + CSV summaries.
"""

import os
import sys
import psycopg2
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
from datetime import datetime

# Use centralized config from etl
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "etl"))
from config import DB_CONFIG, LOG_DIR

BASE = Path(__file__).resolve().parent.parent
CHART_DIR = BASE / "analysis" / "charts"
SUMMARY_DIR = BASE / "analysis" / "summaries"
LOG_PATH = LOG_DIR / "eda.log"


def query_df(conn, sql: str) -> pd.DataFrame:
    return pd.read_sql_query(sql, conn)


def save_csv(df: pd.DataFrame, name: str):
    SUMMARY_DIR.mkdir(parents=True, exist_ok=True)
    path = SUMMARY_DIR / name
    df.to_csv(path, index=False)
    return path


def save_chart(fig, name: str):
    CHART_DIR.mkdir(parents=True, exist_ok=True)
    path = CHART_DIR / name
    fig.write_html(str(path), include_plotlyjs="cdn", full_html=True)
    return path


def fmt_idr(val):
    if val is None:
        return "N/A"
    return f"Rp{val:,.0f}"


def fmt_pct(val):
    if val is None:
        return "N/A"
    return f"{val:.1f}%"


def fmt_short_idr(val):
    if val is None:
        return "N/A"
    if abs(val) >= 1e9:
        return f"Rp{val/1e9:.1f}B"
    elif abs(val) >= 1e6:
        return f"Rp{val/1e6:.1f}M"
    elif abs(val) >= 1e3:
        return f"Rp{val/1e3:.1f}K"
    return f"Rp{val:,.0f}"


# ---------------------------------------------------------------------------
# Analysis 1 & 2: Monthly Revenue + Transaction Count
# ---------------------------------------------------------------------------

def monthly_revenue_txns(conn):
    df = query_df(conn, """
        SELECT
            d.year_month,
            SUM(f.revenue)::float AS revenue,
            COUNT(*)::int AS transactions,
            AVG(f.margin_pct)::float AS avg_margin_pct
        FROM fact_sales f
        JOIN dim_date d ON f.date_key = d.date_key
        WHERE f.flag_qty_le_zero = false
        GROUP BY d.year_month
        ORDER BY d.year_month;
    """)
    save_csv(df, "monthly_revenue.csv")

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=df["year_month"], y=df["transactions"],
        name="Transactions", yaxis="y2",
        marker_color="rgba(100, 140, 255, 0.5)",
        hovertemplate="%{y:,.0f} txns<extra></extra>",
    ))
    fig.add_trace(go.Scatter(
        x=df["year_month"], y=df["revenue"],
        name="Revenue", yaxis="y",
        mode="lines+markers",
        line=dict(color="#2563eb", width=3),
        marker=dict(size=10),
        hovertemplate="Rp%{y:,.0f}<extra></extra>",
    ))
    fig.update_layout(
        title="Monthly Revenue & Transaction Count",
        xaxis=dict(title="Month"),
        yaxis=dict(title="Revenue (IDR)", side="left"),
        yaxis2=dict(title="Transactions", overlaying="y", side="right"),
        hovermode="x unified",
        template="plotly_white",
        legend=dict(orientation="h", y=1.1),
    )
    fig.add_annotation(
        xref="paper", yref="paper", x=0, y=-0.2,
        text="Note: Only 5 of 12 months have valid date data (7.6% of rows)",
        showarrow=False, font=dict(size=10, color="#888"),
    )
    save_chart(fig, "01_monthly_revenue.html")

    print(f"\n-- Monthly Revenue & Transactions --")
    print(f"  Months with data: {len(df)} / 12")
    print(f"  Total revenue (dated rows): {fmt_idr(df['revenue'].sum())}")
    print(f"  Total transactions (dated): {df['transactions'].sum():,}")
    print(f"  Avg margin (dated): {fmt_pct(df['avg_margin_pct'].mean())}")

    top_rev = df.loc[df["revenue"].idxmax()]
    print(f"  Highest revenue month: {top_rev['year_month']} ({fmt_idr(top_rev['revenue'])})")

    return df


# ---------------------------------------------------------------------------
# Analysis 3: Revenue by Transaction Type
# ---------------------------------------------------------------------------

def revenue_by_txn_type(conn):
    df = query_df(conn, """
        SELECT
            t.transaction_type,
            SUM(f.revenue)::float AS revenue,
            COUNT(*)::int AS transactions,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            SUM(f.qty)::float AS total_qty,
            SUM(f.gross_margin)::float AS total_gross_margin
        FROM fact_sales f
        JOIN dim_transaction t ON f.no_resep = t.no_resep
        WHERE f.flag_qty_le_zero = false
        GROUP BY t.transaction_type
        ORDER BY SUM(f.revenue) DESC;
    """)
    save_csv(df, "revenue_by_txn_type.csv")

    colors = {"Outpatient": "#2563eb", "Inpatient": "#16a34a", "Unknown": "#9ca3af"}
    fig = px.bar(
        df, x="transaction_type", y="revenue",
        color="transaction_type", color_discrete_map=colors,
        title="Revenue by Transaction Type",
        labels={"transaction_type": "Channel", "revenue": "Revenue (IDR)"},
        template="plotly_white",
    )
    fig.update_traces(
        textposition="outside",
        hovertemplate="%{y:,.0f}<extra></extra>",
        text=df["revenue"].apply(fmt_short_idr).tolist(),
        texttemplate="%{text}",
    )
    fig.add_annotation(
        xref="paper", yref="paper", x=0, y=-0.2,
        text=f"All rows included (dated + undated) -- {df['transactions'].sum():,} total transactions",
        showarrow=False, font=dict(size=10, color="#888"),
    )
    save_chart(fig, "02_revenue_by_txn_type.html")

    print(f"\n-- Revenue by Transaction Type --")
    total_rev = df["revenue"].sum()
    for _, r in df.iterrows():
        share = r["revenue"] / total_rev * 100 if total_rev else 0
        print(f"  {r['transaction_type']}: {fmt_idr(r['revenue'])} ({share:.1f}%) -- {fmt_pct(r['avg_margin_pct'])} margin")

    return df


# ---------------------------------------------------------------------------
# Analysis 4: Revenue by Product Type
# ---------------------------------------------------------------------------

def revenue_by_product_type(conn):
    df = query_df(conn, """
        SELECT
            p.product_type,
            SUM(f.revenue)::float AS revenue,
            COUNT(*)::int AS transactions,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            SUM(f.qty)::float AS total_qty,
            SUM(f.gross_margin)::float AS total_gross_margin
        FROM fact_sales f
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false
        GROUP BY p.product_type
        ORDER BY SUM(f.revenue) DESC;
    """)
    save_csv(df, "revenue_by_product_type.csv")

    colors = {"Generic": "#f59e0b", "Branded": "#6366f1"}
    fig = px.bar(
        df, x="product_type", y="revenue",
        color="product_type", color_discrete_map=colors,
        title="Revenue by Product Type (Generic vs Branded)",
        labels={"product_type": "Product Type", "revenue": "Revenue (IDR)"},
        template="plotly_white",
    )
    fig.update_traces(
        textposition="outside",
        hovertemplate="%{y:,.0f}<extra></extra>",
        text=df["revenue"].apply(fmt_short_idr).tolist(),
        texttemplate="%{text}",
    )
    save_chart(fig, "03_revenue_by_product_type.html")

    print(f"\n-- Revenue by Product Type --")
    total_rev = df["revenue"].sum()
    for _, r in df.iterrows():
        share = r["revenue"] / total_rev * 100 if total_rev else 0
        print(f"  {r['product_type']}: {fmt_idr(r['revenue'])} ({share:.1f}%) -- {fmt_pct(r['avg_margin_pct'])} margin")

    return df


# ---------------------------------------------------------------------------
# Analysis 5: Monthly Product Type Trend
# ---------------------------------------------------------------------------

def monthly_product_trend(conn):
    df = query_df(conn, """
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
    save_csv(df, "monthly_product_trend.csv")

    fig = px.line(
        df, x="year_month", y="revenue", color="product_type",
        markers=True,
        title="Monthly Revenue Trend by Product Type",
        labels={"year_month": "Month", "revenue": "Revenue (IDR)", "product_type": "Product Type"},
        color_discrete_map={"Generic": "#f59e0b", "Branded": "#6366f1"},
        template="plotly_white",
    )
    fig.update_traces(line=dict(width=3), marker=dict(size=8))
    fig.add_annotation(
        xref="paper", yref="paper", x=0, y=-0.2,
        text="Dated rows only -- 5 months with data",
        showarrow=False, font=dict(size=10, color="#888"),
    )
    save_chart(fig, "04_monthly_product_type_trend.html")

    print(f"\n-- Monthly Product Type Trend --")
    print(f"  Data points: {len(df)} (product-type x month combinations)")

    return df


# ---------------------------------------------------------------------------
# Analysis 6: Top 20 SKUs by Revenue
# ---------------------------------------------------------------------------

def top_20_skus(conn):
    df = query_df(conn, """
        SELECT
            f.kd_obat,
            p.product_type,
            p.price_tier,
            SUM(f.revenue)::float AS revenue,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            SUM(f.qty)::float AS total_qty,
            COUNT(*)::int AS transaction_count
        FROM fact_sales f
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false
        GROUP BY f.kd_obat, p.product_type, p.price_tier
        ORDER BY SUM(f.revenue) DESC
        LIMIT 20;
    """)
    save_csv(df, "top20_skus.csv")

    df_sorted = df.sort_values("revenue")
    colors = {"Generic": "#f59e0b", "Branded": "#6366f1"}
    fig = px.bar(
        df_sorted, y="kd_obat", x="revenue",
        color="product_type", color_discrete_map=colors,
        orientation="h",
        title="Top 20 SKUs by Revenue",
        labels={"kd_obat": "SKU Code", "revenue": "Revenue (IDR)", "product_type": "Product Type"},
        template="plotly_white",
        hover_data={"avg_margin_pct": ":.1f", "transaction_count": True},
    )
    fig.update_traces(
        textposition="outside",
        text=df_sorted["revenue"].apply(fmt_short_idr).tolist(),
        texttemplate="%{text}",
    )
    fig.update_layout(yaxis=dict(autorange="reversed"))
    save_chart(fig, "05_top20_skus.html")

    total_rev = df["revenue"].sum()
    print(f"\n-- Top 20 SKUs by Revenue --")
    print(f"  Top 20 revenue: {fmt_idr(total_rev)}")
    for i, (_, r) in enumerate(df.iterrows(), 1):
        print(f"    {i}. {r['kd_obat']} ({r['product_type']}) -- {fmt_idr(r['revenue'])} -- margin: {fmt_pct(r['avg_margin_pct'])}")

    return df


# ---------------------------------------------------------------------------
# Analysis 7: Margin % Histogram
# ---------------------------------------------------------------------------

def margin_histogram(conn):
    df = query_df(conn, """
        SELECT
            f.kd_obat,
            p.product_type,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            SUM(f.revenue)::float AS revenue
        FROM fact_sales f
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false AND f.margin_pct IS NOT NULL
        GROUP BY f.kd_obat, p.product_type;
    """)
    save_csv(df, "margin_distribution.csv")

    fig = px.histogram(
        df, x="avg_margin_pct", nbins=40,
        color="product_type",
        color_discrete_map={"Generic": "#f59e0b", "Branded": "#6366f1"},
        title="SKU Margin % Distribution",
        labels={"avg_margin_pct": "Average Margin %", "count": "SKU Count", "product_type": "Product Type"},
        template="plotly_white",
    )
    fig.add_vline(x=10, line_dash="dash", line_color="red", annotation_text="10% threshold", annotation_position="top left")
    fig.add_vline(x=0, line_dash="dot", line_color="#888", annotation_text="0%", annotation_position="top right")
    fig.add_annotation(
        xref="paper", yref="paper", x=0, y=-0.2,
        text="Red dashed line: 10% margin threshold (margin risk)",
        showarrow=False, font=dict(size=10, color="#888"),
    )
    save_chart(fig, "06_margin_histogram.html")

    below_10 = df[df["avg_margin_pct"] < 10]
    below_0 = df[df["avg_margin_pct"] < 0]
    print(f"\n-- Margin % Distribution --")
    print(f"  Total SKUs: {len(df)}")
    print(f"  SKUs below 10% margin: {len(below_10)} ({len(below_10)/len(df)*100:.1f}%)")
    print(f"  SKUs with negative margin: {len(below_0)}")
    print(f"  Revenue at risk (below 10%): {fmt_idr(below_10['revenue'].sum())}")

    return df


# ---------------------------------------------------------------------------
# Analysis 8: Price Tier Distribution
# ---------------------------------------------------------------------------

def price_tier_distribution(conn):
    df = query_df(conn, """
        SELECT
            p.price_tier,
            COUNT(DISTINCT f.kd_obat)::int AS sku_count,
            SUM(f.revenue)::float AS revenue,
            COUNT(*)::int AS transactions,
            SUM(f.qty)::float AS total_qty
        FROM fact_sales f
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false
        GROUP BY p.price_tier
        ORDER BY SUM(f.revenue) DESC;
    """)
    save_csv(df, "price_tier_distribution.csv")

    colors = {"Low": "#6b7280", "Mid": "#3b82f6", "High": "#f59e0b", "Premium": "#ef4444"}
    fig = go.Figure()
    fig.add_trace(go.Pie(
        labels=df["price_tier"], values=df["revenue"],
        name="Revenue",
        marker_colors=[colors.get(t, "#9ca3af") for t in df["price_tier"]],
        textinfo="label+percent",
        hovertemplate="%{label}: Rp%{value:,.0f} (%{percent})<extra></extra>",
        domain=dict(x=[0, 0.48]),
        title=dict(text="Revenue"),
    ))
    fig.add_trace(go.Pie(
        labels=df["price_tier"], values=df["sku_count"],
        name="SKU Count",
        marker_colors=[colors.get(t, "#9ca3af") for t in df["price_tier"]],
        textinfo="label+percent",
        hovertemplate="%{label}: %{value} SKUs (%{percent})<extra></extra>",
        domain=dict(x=[0.52, 1]),
        title=dict(text="SKU Count"),
    ))
    fig.update_layout(
        title="Price Tier Distribution -- Revenue vs SKU Count",
        template="plotly_white",
        annotations=[
            dict(text="Revenue", x=0.16, y=0.5, showarrow=False, font=dict(size=14)),
            dict(text="SKUs", x=0.84, y=0.5, showarrow=False, font=dict(size=14)),
        ]
    )
    save_chart(fig, "07_price_tier_distribution.html")

    print(f"\n-- Price Tier Distribution --")
    for _, r in df.iterrows():
        print(f"  {r['price_tier']}: {r['sku_count']} SKUs, {fmt_idr(r['revenue'])} revenue, {r['transactions']:,} txns")

    return df


# ---------------------------------------------------------------------------
# Analysis 9: Revenue vs Margin % Scatter
# ---------------------------------------------------------------------------

def revenue_vs_margin_scatter(conn):
    df = query_df(conn, """
        SELECT
            f.kd_obat,
            p.product_type,
            SUM(f.revenue)::float AS revenue,
            SUM(f.qty)::float AS total_qty,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            COUNT(*)::int AS transaction_count
        FROM fact_sales f
        JOIN dim_product p ON f.kd_obat = p.kd_obat
        WHERE f.flag_qty_le_zero = false AND f.margin_pct IS NOT NULL
        GROUP BY f.kd_obat, p.product_type;
    """)
    save_csv(df, "sku_performance.csv")

    fig = px.scatter(
        df, x="revenue", y="avg_margin_pct",
        size="total_qty", color="product_type",
        color_discrete_map={"Generic": "#f59e0b", "Branded": "#6366f1"},
        hover_name="kd_obat",
        hover_data={"transaction_count": True, "total_qty": True},
        title="Revenue vs Margin % -- SKU Performance Quadrant",
        labels={"revenue": "Revenue (IDR)", "avg_margin_pct": "Average Margin %"},
        template="plotly_white",
    )
    median_rev = df["revenue"].median()
    median_margin = df["avg_margin_pct"].median()
    fig.add_vline(x=median_rev, line_dash="dash", line_color="#888", opacity=0.3)
    fig.add_hline(y=median_margin, line_dash="dash", line_color="#888", opacity=0.3)
    fig.add_annotation(x=median_rev * 3, y=median_margin + 5, text="Medians (dashed)", showarrow=False, font=dict(size=9, color="#888"))
    fig.add_hrect(y0=-100, y1=10, line_width=0, fillcolor="red", opacity=0.03, annotation_text="Risk zone (<10%)", annotation_position="top left")
    save_chart(fig, "08_revenue_vs_margin_scatter.html")

    print(f"\n-- Revenue vs Margin % Scatter --")
    print(f"  SKUs plotted: {len(df)}")
    risk_zone = df[df["avg_margin_pct"] < 10]
    print(f"  SKUs in risk zone (<10%% margin): {len(risk_zone)}")
    print(f"  Median revenue per SKU: {fmt_idr(median_rev)}")
    print(f"  Median margin %%: {fmt_pct(median_margin)}")

    risk_sorted = risk_zone.sort_values("revenue", ascending=False).head(5)
    print(f"  Top 5 risk SKUs (highest revenue, <10%% margin):")
    for _, r in risk_sorted.iterrows():
        print(f"    {r['kd_obat']} ({r['product_type']}): {fmt_idr(r['revenue'])} -- margin: {fmt_pct(r['avg_margin_pct'])}")

    return df


# ---------------------------------------------------------------------------
# Combined Totals (for insights log)
# ---------------------------------------------------------------------------

def global_totals(conn):
    df = query_df(conn, """
        SELECT
            COUNT(*)::int AS total_rows,
            SUM(f.revenue)::float AS total_revenue,
            SUM(f.gross_margin)::float AS total_gross_margin,
            AVG(f.margin_pct)::float AS avg_margin_pct,
            SUM(f.qty)::float AS total_qty,
            COUNT(DISTINCT f.kd_obat)::int AS total_skus,
            COUNT(DISTINCT f.no_resep)::int AS total_transactions
        FROM fact_sales f
        WHERE f.flag_qty_le_zero = false;
    """)
    return df.iloc[0]


def undated_summary(conn):
    df = query_df(conn, """
        SELECT
            COUNT(*)::int AS undated_rows,
            SUM(f.revenue)::float AS undated_revenue
        FROM fact_sales f
        WHERE f.date_key IS NULL AND f.flag_qty_le_zero = false;
    """)
    return df.iloc[0]


def main():
    CHART_DIR.mkdir(parents=True, exist_ok=True)
    SUMMARY_DIR.mkdir(parents=True, exist_ok=True)

    conn = psycopg2.connect(**DB_CONFIG)
    conn.set_session(autocommit=True)

    border = "-" * 60
    print(border)
    print("  Phase 2 -- EDA (SCAN Framework)")
    print(border)

    totals = global_totals(conn)
    undated = undated_summary(conn)
    dated_rows = totals["total_rows"] - undated["undated_rows"]

    print(f"\n-- Global Summary --")
    print(f"  Total rows (fact_sales, QTY>0): {totals['total_rows']:,}")
    print(f"  Total revenue (ALL rows):        {fmt_idr(totals['total_revenue'])}")
    print(f"  Total gross margin:              {fmt_idr(totals['total_gross_margin'])}")
    print(f"  Avg margin %%:                    {fmt_pct(totals['avg_margin_pct'])}")
    print(f"  Total SKUs:                      {totals['total_skus']:,}")
    print(f"  Total transactions:              {totals['total_transactions']:,}")
    print(f"  Undated rows:                    {undated['undated_rows']:,} ({undated['undated_rows']/totals['total_rows']*100:.1f}%%)")
    print(f"  Dated rows:                      {dated_rows:,} ({dated_rows/totals['total_rows']*100:.1f}%%)")

    monthly = monthly_revenue_txns(conn)
    rev_txn = revenue_by_txn_type(conn)
    rev_prod = revenue_by_product_type(conn)
    monthly_prod = monthly_product_trend(conn)
    top20 = top_20_skus(conn)
    margin_df = margin_histogram(conn)
    price_tier_df = price_tier_distribution(conn)
    scatter_df = revenue_vs_margin_scatter(conn)

    conn.close()

    # -- Log --
    chart_files = sorted(os.listdir(CHART_DIR))
    csv_files = sorted(os.listdir(SUMMARY_DIR))
    log_lines = [
        f"eda.py -- {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"  total_fact_rows:     {totals['total_rows']:,}",
        f"  total_revenue:       {totals['total_revenue']:.0f}",
        f"  total_gross_margin:  {totals['total_gross_margin']:.0f}",
        f"  avg_margin_pct:      {totals['avg_margin_pct']:.2f}",
        f"  total_skus:          {totals['total_skus']}",
        f"  undated_rows:        {undated['undated_rows']:,} ({undated['undated_rows']/totals['total_rows']*100:.1f}%)",
        f"  dated_months:        {len(monthly)} / 12",
        f"  charts_exported:     {len(chart_files)}",
        f"  csvs_exported:       {len(csv_files)}",
        "",
        "Charts:",
        *[f"  {f}" for f in chart_files],
        "",
        "CSVs:",
        *[f"  {f}" for f in csv_files],
        "",
    ]
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text("\n".join(log_lines), encoding="utf-8")
    print(f"\nLog written to {LOG_PATH}")
    print(f"Charts exported to {CHART_DIR}/ ({len(chart_files)} files)")
    print(f"CSVs exported to {SUMMARY_DIR}/ ({len(csv_files)} files)")
    print("-" * 60)


if __name__ == "__main__":
    main()
