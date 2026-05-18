# Wireframe Spec — Page 2: Product Performance
**Fidelity:** Annotated Mid-Fi  
**Audience:** Finance Manager, Procurement (mixed technical)  
**Decision Enabled:** "Which products and categories should we prioritise in 2016 procurement?"  
**Data Source:** `products.json`

---

## Layout — Desktop (1280px)

```
┌─────────────────────────────────────────────────────────────────────┐
│ NAVIGATION                                                    [1]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🏥 Pharmacy Analytics  [Overview] [Products] [Margin Risk]      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│  "Products" active (underlined)                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                   [2]   │
│  H1: "Product Performance"                                          │
│  Subtitle: "Revenue, Margin & SKU Analysis · Full Year 2015"        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ GLOBAL FILTERS (same component as Page 1)                     [3]   │
│ ┌───────────────┐  ┌─────────────────────┐  ┌──────────────────┐  │
│ │ Month [All ▼] │  │ Transaction Type[▼] │  │ Product Type [▼] │  │
│ └───────────────┘  └─────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ KPI CARDS ROW                                                 [4]   │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │
│ │ GENERIC REVENUE  │ │ BRANDED REVENUE  │ │ TOTAL SKUs       │    │
│ │                  │ │                  │ │                  │    │
│ │  Rp [~~~,~~~]    │ │  Rp [~~~,~~~]    │ │    [~~~]         │    │
│ │  ~~% of total    │ │  ~~% of total    │ │  active SKUs     │    │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘    │
│                                                                     │
│  [4a] "~~% of total" = share of annual revenue for that type        │
│  [4b] Responds to all filters — if Product Type = Generic,          │
│       Branded card grays out with "filtered out" label              │
│  [4c] Total SKUs = count of distinct KD_OBAT in filtered view       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐  ┌───────────────────────────────────────┐
│ REVENUE BY PRODUCT TYPE │  │ MONTHLY REVENUE BY PRODUCT TYPE [6]   │
│                   [5]   │  │                                       │
│ H2: "Generic vs Branded"│  │ H2: "Monthly Trend by Product Type"   │
│                         │  │                                       │
│  Rp ▲                   │  │  Rp ▲  ─────── Branded               │
│     │  ████             │  │     │  - - - - Generic               │
│     │  ████  ░░░░       │  │     │                                 │
│     │  ████  ░░░░       │  │     │    ╭─────╮                     │
│     │  ████  ░░░░       │  │     │   ╱  ╭──╯╲                    │
│     └──────────────     │  │     │  ╱  ╱     ╲___                 │
│        Gen   Brand      │  │     │ - -╱ ─ ─ ─ ─ ─ ─ ─            │
│                         │  │     └──────────────────────▶         │
│  [tooltip: type |       │  │       Jan Feb ... Dec                 │
│   Rev | Margin% | Txns] │  │                                       │
│  Height: 240px          │  │  Height: 240px                        │
│  Width: ~35% of row     │  │  Width: ~60% of row                   │
└─────────────────────────┘  └───────────────────────────────────────┘

│  [5a] Chart type: Recharts BarChart, 2 bars side by side           │
│  [5b] Each bar labeled with Rp value above                          │
│  [6a] Chart type: Recharts LineChart, 2 series                      │
│  [6b] Branded = solid line, Generic = dashed line                   │
│  [6c] Shared tooltip showing both values on hover                   │

┌─────────────────────────────────────────────────────────────────────┐
│ REVENUE vs MARGIN % SCATTER (SKU QUADRANT VIEW)               [7]  │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ H2: "SKU Performance — Revenue vs Margin %"                     │ │
│ │ Subtitle: "Size = transaction volume. Quadrants guide priority." │ │
│ │                                                                 │ │
│ │  Margin% ▲                     │                               │ │
│ │          │  [Watch]            │  [Prioritise] ★              │ │
│ │   High   │  · ·  ·             │  ·  ·    ·  ·                │ │
│ │          │     ·               │     · ·     ·                 │ │
│ │   ───────┼─────────────────────┼──────────────────── Revenue   │ │
│ │          │                     │                               │ │
│ │   Low    │  [Review/Drop]      │  [Investigate]               │ │
│ │          │  · ·                │  ·      ·                     │ │
│ │          │     ·  ·            │                               │ │
│ │          └─────────────────────┴──────────────────────────▶   │ │
│ │             Low Revenue           High Revenue                  │ │
│ │                                                                 │ │
│ │  Legend: ● Generic  ○ Branded  (dot size = transaction count)   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [7a] Chart type: Recharts ScatterChart                             │
│  [7b] X-axis: SKU revenue (IDR). Y-axis: margin %                  │
│  [7c] Dot size: transaction count (small/medium/large buckets)      │
│  [7d] Dot fill: Generic = dark, Branded = hollow/light              │
│  [7e] Quadrant lines drawn at median revenue and median margin %    │
│  [7f] Quadrant labels: "Prioritise" (high rev, high margin),        │
│       "Investigate" (high rev, low margin),                         │
│       "Watch" (low rev, high margin),                               │
│       "Review/Drop" (low rev, low margin)                           │
│  [7g] Hover tooltip: SKU code | Revenue | Margin % | Transactions  │
│  [7h] Height: 320px. This is the analytical centerpiece of the page │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TOP 20 SKUs TABLE                                             [8]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ H2: "Top 20 SKUs by Revenue"          [Search SKU...] [Export] │ │
│ │                                                                 │ │
│ │ Rank│ SKU Code  │ Type    │ Revenue(IDR)│ Txns  │ Margin%│ Tier│ │
│ │ ────┼───────────┼─────────┼─────────────┼───────┼────────┼─────│ │
│ │  1  │ R-~~~~    │ Branded │ ~~~,~~~,~~~ │ ~,~~~ │ ~~.~%  │ Mid │ │
│ │  2  │ AI-~~~~   │ Generic │ ~~~,~~~,~~~ │ ~,~~~ │ ~~.~%  │ Low │ │
│ │  3  │ R-~~~~    │ Branded │ ~~~,~~~,~~~ │ ~,~~~ │ ~~.~%  │ High│ │
│ │ ... │ ...       │ ...     │ ...         │ ...   │ ...    │ ... │ │
│ │ 20  │ AI-~~~~   │ Generic │ ~~~,~~~,~~~ │ ~,~~~ │ ~~.~%  │ Mid │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [8a] Default sort: Revenue descending                              │
│  [8b] All columns sortable (click header)                           │
│  [8c] Margin% column: red text if below 10% threshold               │
│  [8d] Type column: pill badge — "Generic" (dark) / "Branded" (light)│
│  [8e] Search: filters table rows client-side by SKU code            │
│  [8f] Export button: downloads visible rows as CSV                  │
│  [8g] Responds to all three global filters                          │
│  [8h] TanStack Table component                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layout — Mobile (390px)

```
┌────────────────────────────┐
│ NAV                  [≡]   │
├────────────────────────────┤
│ H1: Product Performance    │
│ Subtitle (1 line)          │
├────────────────────────────┤
│ FILTERS (stacked, 3 rows)  │
├────────────────────────────┤
│ KPI: Generic Revenue       │
│ KPI: Branded Revenue       │
│ KPI: Total SKUs            │
├────────────────────────────┤
│ BAR CHART (Gen vs Brand)   │  Horizontal bars on mobile
│ Full width, height 160px   │
├────────────────────────────┤
│ LINE CHART (Monthly trend) │  Full width, height 200px
│ Legend below chart         │
├────────────────────────────┤
│ SCATTER (SKU Quadrant)     │  Full width, height 280px
│ Pinch-to-zoom enabled      │
├────────────────────────────┤
│ TABLE (scroll horizontal)  │
│ Sticky rank + SKU columns  │
│ Paginated: 10 rows/page    │
└────────────────────────────┘
```

---

## States

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton placeholders for all charts and table |
| **Filter: Product Type = Generic** | Branded KPI card grays out; bar chart shows single bar; scatter shows Generic dots only; table filtered |
| **Filter: Product Type = Branded** | Reverse of above |
| **Filter: specific month** | All charts and table reflect that month's data only |
| **Table search active** | Scatter chart highlights matching SKU dots; others dimmed |
| **Scatter dot hover** | Tooltip appears; corresponding table row highlighted |

---

## Annotations

| # | Element | Note |
|---|---------|------|
| 4 | KPI cards | Unlike Page 1, these cards show type-split values, not totals. Helps Finance see the mix at a glance before drilling into charts |
| 5 | Bar chart | Intentionally simple — 2 bars only. Fights the temptation to add more series |
| 6 | Line chart | Dashed line for Generic distinguishes without color dependency (accessible) |
| 7 | Scatter quadrant | This is the most analytically dense element in the project. Label quadrants clearly. Median lines, not arbitrary thresholds |
| 8 | Table search | Client-side only — no API call. Fast. Cross-highlights scatter chart to show spatial position of searched SKU |

---

## Content Specifications

| Element | Content Source | Format |
|---------|---------------|--------|
| Generic/Branded revenue | `products.json → summary.generic_revenue / branded_revenue` | `Rp X,XXX,XXX,XXX` |
| % of total | Calculated client-side from summary | `XX.X%` |
| Monthly trend | `products.json → monthly[].generic_rev / branded_rev` | Array of 12 |
| SKU scatter data | `products.json → skus[]` | `{kd_obat, type, revenue, margin_pct, txn_count}` |
| Top 20 table | `products.json → top20[]` | Sorted by revenue desc, pre-computed in `export_json.py` |
| Price tier | `products.json → skus[].price_tier` | Low / Mid / High / Premium |
