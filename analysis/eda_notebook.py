"""
eda_notebook.py
Marimo notebook -- Phase 2 EDA (SCAN Framework).
Interactive Plotly charts with inline explanations.
Usage: marimo edit analysis/eda_notebook.py
"""

import marimo

__generated_with = "0.23.6"
app = marimo.App(width="full")


@app.cell
def _():
    import marimo as mo
    import os
    import psycopg2
    import pandas as pd
    import plotly.express as px
    import plotly.graph_objects as go
    from pathlib import Path

    return go, mo, pd, psycopg2, px


@app.cell
def _(pd, psycopg2):
    DB_CONFIG = {
        "host": "localhost", "port": 5433,
        "dbname": "db_pharmacy", "user": "postgres", "password": "admin",
    }

    def query_df(sql: str) -> pd.DataFrame:
        conn = psycopg2.connect(**DB_CONFIG)
        df = pd.read_sql_query(sql, conn)
        conn.close()
        return df

    def fmt_idr(val):
        if val is None:
            return "N/A"
        return f"Rp{val:,.0f}"

    def fmt_pct(val):
        if val is None:
            return "N/A"
        return f"{val:.1f}%"

    return fmt_idr, fmt_pct, query_df


@app.cell
def _(fmt_idr, fmt_pct, mo, query_df):
    totals = query_df("""
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
    """).iloc[0]
    undated = query_df("""
        SELECT
            COUNT(*)::int AS undated_rows,
            SUM(f.revenue)::float AS undated_revenue
        FROM fact_sales f
        WHERE f.date_key IS NULL AND f.flag_qty_le_zero = false;
    """).iloc[0]

    dated_pct = (1 - undated["undated_rows"] / totals["total_rows"]) * 100

    mo.md(f"""
    # Pharmacy Retail Sales -- EDA Report

    **Data source:** Hospital pharmacy system (2015) -- {totals['total_rows']:,.0f} transaction lines
    **Pipeline:** MariaDB to PostgreSQL star schema to marimo notebook

    ---

    ## Global Summary

    | Metric | Value |
    |---|---|
    | **Total Revenue** | {fmt_idr(totals['total_revenue'])} |
    | **Total Gross Margin** | {fmt_idr(totals['total_gross_margin'])} |
    | **Average Margin %** | {fmt_pct(totals['avg_margin_pct'])} |
    | **Total SKUs** | {totals['total_skus']:,} |
    | **Total Transactions** | {totals['total_transactions']:,} |
    | **Dated rows (monthly-capable)** | {dated_pct:.1f}% |
    | **Undated rows (no month)** | {undated['undated_rows'] / totals['total_rows'] * 100:.1f}% |

    > **Critical data note:** Only {dated_pct:.1f}% of rows have valid dates (92.4% have
    > irregular NO_RESEP formats). Monthly trend charts below show only 5 of 12 months.
    > Product-type and channel-level aggregations include ALL rows.
    """).center()
    return


@app.cell
def _(fmt_idr, fmt_pct, go, mo, query_df):
    _df_m = query_df("""
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

    _fig = go.Figure()
    _fig.add_trace(go.Bar(
        x=_df_m["year_month"], y=_df_m["transactions"],
        name="Transactions", yaxis="y2",
        marker_color="rgba(100, 140, 255, 0.5)",
        hovertemplate="%{y:,.0f} txns<extra></extra>",
    ))
    _fig.add_trace(go.Scatter(
        x=_df_m["year_month"], y=_df_m["revenue"],
        name="Revenue", yaxis="y",
        mode="lines+markers",
        line=dict(color="#2563eb", width=3),
        marker=dict(size=10),
        hovertemplate="Rp%{y:,.0f}<extra></extra>",
    ))
    _fig.update_layout(
        title="Monthly Revenue & Transaction Count",
        xaxis=dict(title="Month"),
        yaxis=dict(title="Revenue (IDR)", side="left"),
        yaxis2=dict(title="Transactions", overlaying="y", side="right"),
        hovermode="x unified", template="plotly_white",
        legend=dict(orientation="h", y=1.1),
    )

    _top_month = _df_m.loc[_df_m["revenue"].idxmax()]

    mo.md(f"""
    ## 01 -- Monthly Revenue & Transaction Count

    This dual-axis chart shows revenue (line) and transaction volume (bars) across the
    {len(_df_m)} months with valid date data. Only 7.6% of total rows carry valid dates,
    limiting monthly visibility to 5 months.

    - **Highest month:** {_top_month['year_month']} at {fmt_idr(_top_month['revenue'])}
    - **Lowest month:** {_df_m.loc[_df_m['revenue'].idxmin()]['year_month']} at {fmt_idr(_df_m['revenue'].min())}
    - **Avg margin across months:** {fmt_pct(_df_m['avg_margin_pct'].mean())}
    - **Total dated revenue:** {fmt_idr(_df_m['revenue'].sum())}

    > **Insight:** The steep ramp from Rp194K (Jan) to Rp945M (Sep) likely reflects
    > data availability gaps rather than actual growth. Sep has 19,324 transactions
    > vs Jan's 6 -- the difference is data coverage, not demand.

    {mo.as_html(_fig)}
    """)
    return


@app.cell
def _(fmt_idr, fmt_pct, mo, px, query_df):
    _df_txn = query_df("""
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

    _colors = {"Outpatient": "#2563eb", "Inpatient": "#16a34a", "Unknown": "#9ca3af"}
    _fig = px.bar(
        _df_txn, x="transaction_type", y="revenue",
        color="transaction_type", color_discrete_map=_colors,
        text_auto=".2s",
        title="Revenue by Transaction Type",
        labels={"transaction_type": "Channel", "revenue": "Revenue (IDR)"},
        template="plotly_white",
    )
    _fig.update_traces(textposition="outside", hovertemplate="%{y:,.0f}<extra></extra>")

    _total_rev = _df_txn["revenue"].sum()
    _lines = []
    for _, _r in _df_txn.iterrows():
        _share = _r["revenue"] / _total_rev * 100
        _lines.append(f"- **{_r['transaction_type']}:** {fmt_idr(_r['revenue'])} ({_share:.1f}%) -- margin {fmt_pct(_r['avg_margin_pct'])}")

    mo.md(f"""
    ## 02 -- Revenue by Transaction Type

    The outpatient (RJ) channel is the primary revenue driver. All rows included
    (dated + undated -- {_df_txn['transactions'].sum():,} total transactions).

    {chr(10).join(_lines)}

    > **Insight:** Outpatient dominates at 63.8% of revenue with nearly identical
    > margins to inpatient (~35%). The Unknown group (RL-/UM- prefixes) represents
    > Rp1.4B (7.5%) -- worth investigating what transaction type RL- maps to in
    > the source system.

    {mo.as_html(_fig)}
    """)
    return


@app.cell
def _(fmt_idr, fmt_pct, mo, px, query_df):
    _df_prod = query_df("""
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

    _colors = {"Generic": "#f59e0b", "Branded": "#6366f1"}
    _fig = px.bar(
        _df_prod, x="product_type", y="revenue",
        color="product_type", color_discrete_map=_colors,
        text_auto=".2s",
        title="Revenue by Product Type",
        labels={"product_type": "Product Type", "revenue": "Revenue (IDR)"},
        template="plotly_white",
    )
    _fig.update_traces(textposition="outside", hovertemplate="%{y:,.0f}<extra></extra>")

    _total_rev = _df_prod["revenue"].sum()
    _lines = []
    for _, _r in _df_prod.iterrows():
        _share = _r["revenue"] / _total_rev * 100
        _lines.append(f"- **{_r['product_type']}:** {fmt_idr(_r['revenue'])} ({_share:.1f}%) -- margin {fmt_pct(_r['avg_margin_pct'])}")

    mo.md(f"""
    ## 03 -- Revenue by Product Type

    Generic medicines dominate revenue, but both categories earn nearly identical margins.

    {chr(10).join(_lines)}

    > **Insight:** The pharmacy is NOT trading margin for volume -- both generics and
    > branded medicines run at ~35% margin. This is unusual: typically generics have
    > higher percentage margins. Procurement should verify if supplier pricing on
    > generics could be improved, as their volume (70.3% of revenue) creates leverage.

    {mo.as_html(_fig)}
    """)
    return


@app.cell
def _(fmt_idr, mo, px, query_df):
    _df_mpt = query_df("""
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

    _fig = px.line(
        _df_mpt, x="year_month", y="revenue", color="product_type",
        markers=True,
        title="Monthly Revenue Trend by Product Type",
        labels={"year_month": "Month", "revenue": "Revenue (IDR)", "product_type": "Product Type"},
        color_discrete_map={"Generic": "#f59e0b", "Branded": "#6366f1"},
        template="plotly_white",
    )
    _fig.update_traces(line=dict(width=3), marker=dict(size=8))

    _generic_total = _df_mpt[_df_mpt["product_type"] == "Generic"]["revenue"].sum()
    _branded_total = _df_mpt[_df_mpt["product_type"] == "Branded"]["revenue"].sum()

    mo.md(f"""
    ## 04 -- Monthly Revenue Trend by Product Type

    Generic vs branded revenue across the 5 months with valid date data.

    - **Generic (dated):** {fmt_idr(_generic_total)} -- consistently higher across all months
    - **Branded (dated):** {fmt_idr(_branded_total)}
    - **Data points:** {len(_df_mpt)} (product-type x month combinations)

    > **Insight:** The generic-to-branded ratio stays relatively stable across months,
    > suggesting the product mix is consistent rather than seasonal. Generic dominance
    > is structural, not a quarterly phenomenon.

    {mo.as_html(_fig)}
    """)
    return


@app.cell
def _(fmt_idr, fmt_pct, mo, px, query_df):
    _df_top = query_df("""
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

    _df_sorted = _df_top.sort_values("revenue")
    _colors = {"Generic": "#f59e0b", "Branded": "#6366f1"}
    _fig = px.bar(
        _df_sorted, y="kd_obat", x="revenue",
        color="product_type", color_discrete_map=_colors,
        orientation="h",
        title="Top 20 SKUs by Revenue",
        labels={"kd_obat": "SKU Code", "revenue": "Revenue (IDR)", "product_type": "Product Type"},
        text_auto=".2s", template="plotly_white",
        hover_data={"avg_margin_pct": ":.1f", "transaction_count": True},
    )
    _fig.update_traces(textposition="outside")
    _fig.update_layout(yaxis=dict(autorange="reversed"))

    _top_total = _df_top["revenue"].sum()
    _generic_count = len(_df_top[_df_top["product_type"] == "Generic"])
    _branded_count = len(_df_top[_df_top["product_type"] == "Branded"])
    _top_sku = _df_top.iloc[0]

    mo.md(f"""
    ## 05 -- Top 20 SKUs by Revenue

    Revenue concentration is significant -- the top 20 SKUs generate {fmt_idr(_top_total)}
    of total revenue.

    - **Generic SKUs in top 20:** {_generic_count} | **Branded:** {_branded_count}
    - **#1 SKU:** {_top_sku['kd_obat']} ({fmt_idr(_top_sku['revenue'])}, margin {fmt_pct(_top_sku['avg_margin_pct'])})
    - **Top 20 share of total revenue:** {_top_total / 19053932477 * 100:.1f}%

    > **Insight:** 18 of 20 top SKUs are generic -- the pharmacy's revenue is heavily
    > dependent on generic drug sales. Stockouts in the top 3 (AI-0618, AI-0165, AI-0190)
    > would impact Rp3.1B in revenue. Annual volume contracts recommended for these.

    {mo.as_html(_fig)}
    """)
    return


@app.cell
def _(fmt_idr, mo, px, query_df):
    _df_marg = query_df("""
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

    _fig = px.histogram(
        _df_marg, x="avg_margin_pct", nbins=40,
        color="product_type",
        color_discrete_map={"Generic": "#f59e0b", "Branded": "#6366f1"},
        title="SKU Margin % Distribution",
        labels={"avg_margin_pct": "Average Margin %", "count": "SKU Count", "product_type": "Product Type"},
        template="plotly_white",
    )
    _fig.add_vline(x=10, line_dash="dash", line_color="red",
                  annotation_text="10% threshold", annotation_position="top left")
    _fig.add_vline(x=0, line_dash="dot", line_color="#888",
                  annotation_text="0%", annotation_position="top right")

    _below_10 = _df_marg[_df_marg["avg_margin_pct"] < 10]
    _below_0 = _df_marg[_df_marg["avg_margin_pct"] < 0]

    mo.md(f"""
    ## 06 -- Margin % Distribution

    The margin distribution shows a healthy cluster in the 25-45% range. Very few
    SKUs fall below the 10% risk threshold.

    - **Total SKUs:** {len(_df_marg)}
    - **Below 10% margin:** {len(_below_10)} ({len(_below_10)/len(_df_marg)*100:.1f}%)
    - **Negative margin SKUs:** {len(_below_0)}
    - **Revenue at risk (<10%):** {fmt_idr(_below_10['revenue'].sum())}

    > **Insight:** Margin compression is not a systemic risk -- only 1% of SKUs fall
    > below 10%, representing just 0.2% of total revenue. The 23 at-risk SKUs should
    > be individually reviewed for price adjustment or supplier renegotiation rather
    > than treated as a portfolio problem.

    {mo.as_html(_fig)}
    """)
    return


@app.cell
def _(fmt_idr, go, mo, query_df):
    _df_pt = query_df("""
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

    _colors = {"Low": "#6b7280", "Mid": "#3b82f6", "High": "#f59e0b", "Premium": "#ef4444"}
    _fig = go.Figure()
    _fig.add_trace(go.Pie(
        labels=_df_pt["price_tier"], values=_df_pt["revenue"],
        marker_colors=[_colors.get(t, "#9ca3af") for t in _df_pt["price_tier"]],
        textinfo="label+percent",
        hovertemplate="%{label}: Rp%{value:,.0f} (%{percent})<extra></extra>",
        domain=dict(x=[0, 0.48]), title=dict(text="Revenue"),
    ))
    _fig.add_trace(go.Pie(
        labels=_df_pt["price_tier"], values=_df_pt["sku_count"],
        marker_colors=[_colors.get(t, "#9ca3af") for t in _df_pt["price_tier"]],
        textinfo="label+percent",
        hovertemplate="%{label}: %{value} SKUs (%{percent})<extra></extra>",
        domain=dict(x=[0.52, 1]), title=dict(text="SKU Count"),
    ))
    _fig.update_layout(
        title="Price Tier Distribution -- Revenue vs SKU Count",
        template="plotly_white",
        annotations=[
            dict(text="Revenue", x=0.16, y=0.5, showarrow=False, font=dict(size=14)),
            dict(text="SKUs", x=0.84, y=0.5, showarrow=False, font=dict(size=14)),
        ]
    )

    _premium = _df_pt[_df_pt["price_tier"] == "Premium"].iloc[0]
    _mid = _df_pt[_df_pt["price_tier"] == "Mid"].iloc[0]

    mo.md(f"""
    ## 07 -- Price Tier Distribution

    Two stories in one chart: where the money comes from vs where the volume lives.

    - **Premium (HJ > Rp100K):** {_premium['sku_count']} SKUs to {fmt_idr(_premium['revenue'])} revenue
    - **Mid (Rp500-Rp10K):** {_mid['sku_count']} SKUs to {_mid['transactions']:,} transactions (operational backbone)
    - **Transaction volume ratio:** Premium = {_premium['transactions']:,} txns vs Mid = {_mid['transactions']:,} txns

    > **Insight:** Premium SKUs are high-value, low-volume (40.8% of revenue from 12.5%
    > of SKUs). Mid-tier SKUs are the operational engine (45% of all transaction lines).
    > Inventory strategy should differ: ensure premium availability without overstock;
    > optimize procurement process for high-turnover mid-tier items.

    {mo.as_html(_fig)}
    """)
    return


@app.cell
def _(fmt_idr, fmt_pct, mo, px, query_df):
    _df_scat = query_df("""
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

    _fig = px.scatter(
        _df_scat, x="revenue", y="avg_margin_pct",
        size="total_qty", color="product_type",
        color_discrete_map={"Generic": "#f59e0b", "Branded": "#6366f1"},
        hover_name="kd_obat",
        hover_data={"transaction_count": True, "total_qty": True, "revenue": ":.0f"},
        title="Revenue vs Margin % -- SKU Performance Quadrant",
        labels={"revenue": "Revenue (IDR)", "avg_margin_pct": "Average Margin %"},
        template="plotly_white",
    )
    _median_rev = _df_scat["revenue"].median()
    _median_margin = _df_scat["avg_margin_pct"].median()
    _fig.add_vline(x=_median_rev, line_dash="dash", line_color="#888", opacity=0.3)
    _fig.add_hline(y=_median_margin, line_dash="dash", line_color="#888", opacity=0.3)
    _fig.add_annotation(
        x=_median_rev * 3, y=_median_margin + 5,
        text="Medians (dashed)", showarrow=False, font=dict(size=9, color="#888"),
    )
    _fig.add_hrect(
        y0=-100, y1=10, line_width=0, fillcolor="red", opacity=0.03,
        annotation_text="Risk zone (<10%)", annotation_position="top left",
    )

    _risk_zone = _df_scat[_df_scat["avg_margin_pct"] < 10]
    _risk_sorted = _risk_zone.sort_values("revenue", ascending=False).head(5)
    _risk_lines = []
    for _, _r in _risk_sorted.iterrows():
        _risk_lines.append(f"- **{_r['kd_obat']}** ({_r['product_type']}): {fmt_idr(_r['revenue'])} -- margin {fmt_pct(_r['avg_margin_pct'])}")

    mo.md(f"""
    ## 08 -- Revenue vs Margin % -- SKU Performance Quadrant

    Each dot is a SKU. Size = total quantity sold. Color = product type.
    Dashed lines = medians. Red zone = margin risk (<10%).

    - **SKUs plotted:** {len(_df_scat)}
    - **SKUs in risk zone:** {len(_risk_zone)}
    - **Median revenue per SKU:** {fmt_idr(_median_rev)}
    - **Median margin %:** {fmt_pct(_median_margin)}

    **Top at-risk SKUs (highest revenue, <10% margin):**

    {chr(10).join(_risk_lines)}

    > **Insight:** The risk zone is sparsely populated. The highest-revenue risk SKU
    > AI-1061 (Rp24.5M at 9.2% margin) is an order of magnitude smaller than top
    > performers. Margin compression is a targeted issue, not a portfolio-wide concern.

    {mo.as_html(_fig)}
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ---

    ## Key EDA Findings

    | # | Finding | Type | Stakeholder |
    |---|---|---|---|
    | 1 | **Generics drive 70.3% of revenue** -- 18/20 top SKUs are generic, yet margins match branded (~35%) | Directional | Pharmacy Director, Procurement |
    | 2 | **Top 20 SKUs = 35.6% revenue concentration** -- 3 largest generics = Rp3.1B | Actionable | Procurement |
    | 3 | **Outpatient channel = 63.8% of revenue** -- all channels earn ~35% margins | Directional | Pharmacy Director, Finance |
    | 4 | **Margin risk is low** -- only 23 SKUs (1%) below 10% threshold, 0.2% revenue at risk | Actionable | Finance, Procurement |
    | 5 | **Premium tier = 40.8% revenue, 12.5% SKUs** -- high-value, low-volume | Directional | Pharmacy Director, Procurement |
    | 6 | **92.4% rows lack valid dates** -- systemic data quality issue, limits trend analysis | Contextual | All |
    | 7 | **RL-/UM- prefixes = Rp1.4B (7.5%) revenue** -- undocumented transaction types | Investigation | Finance |

    ---

    **Next step:** Phase 3 -- Deep Dive (North Star Method) will answer the three
    exec-driven questions with quantified, stakeholder-ready findings.
    """)
    return


if __name__ == "__main__":
    app.run()
