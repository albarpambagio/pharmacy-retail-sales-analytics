# Wireframe Spec — Page 1: Executive Overview
**Fidelity:** Annotated Mid-Fi  
**Audience:** Pharmacy Director (low technical)  
**Decision Enabled:** "How did the pharmacy perform in 2015?"  
**Data Source:** `overview.json`

---

## Layout — Desktop (1280px)

```
┌─────────────────────────────────────────────────────────────────────┐
│ NAVIGATION                                                    [1]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🏥 Pharmacy Analytics        [Overview] [Products] [Margin Risk]│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│  H: 56px | Logo left, nav links right | Active page underlined      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                   [2]   │
│  H1: "Executive Overview"                                           │
│  Subtitle: "Hospital Pharmacy Performance · Full Year 2015"         │
│  Padding: 32px top, 24px bottom                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ GLOBAL FILTERS                                                [3]   │
│ ┌───────────────┐  ┌─────────────────────┐  ┌──────────────────┐  │
│ │ Month         │  │ Transaction Type     │  │ Product Type     │  │
│ │ [All ▼]       │  │ [All ▼]             │  │ [All ▼]          │  │
│ └───────────────┘  └─────────────────────┘  └──────────────────┘  │
│  Source: static values from JSON. On change → re-renders all        │
│  charts on page. Default: All / All / All                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ KPI CARDS ROW                                                 [4]   │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│ │ TOTAL REVENUE   │ │ TOTAL           │ │ AVG MARGIN %    │       │
│ │                 │ │ TRANSACTIONS    │ │                 │       │
│ │  Rp [~~~,~~~]   │ │   [~~~,~~~]     │ │    [~~.~%]      │       │
│ │                 │ │                 │ │                 │       │
│ │ ↑ ~~ vs prev   │ │ ↑ ~~ vs prev   │ │ ↑ ~~ vs prev   │       │
│ │   month [spark] │ │   month [spark] │ │   month [spark] │       │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
│  [4a] Sparklines: 12-point mini line chart, Jan–Dec 2015           │
│  [4b] Delta vs previous month: shown as ↑↓ with % change           │
│  [4c] "vs prev month" hidden when Month filter = "All"              │
│  [4d] Currency: IDR, formatted with thousand separators             │
│  [4e] Loading state: gray skeleton placeholder while JSON loads     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ MONTHLY REVENUE TREND                                         [5]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ H2: "Monthly Revenue — 2015"                                    │ │
│ │                                                                 │ │
│ │  Rp ▲                                                           │ │
│ │     │    ╭──╮                                                   │ │
│ │     │   ╱    ╲     ╭──╮                                        │ │
│ │     │  ╱      ╲___╱    ╲____                                   │ │
│ │     │ ╱                      ╲___                              │ │
│ │     └────────────────────────────▶                             │ │
│ │       Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec           │ │
│ │                                                                 │ │
│ │  [tooltip on hover: Month | Revenue: Rp X | Transactions: Y]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [5a] Chart type: Recharts LineChart, single series                 │
│  [5b] Y-axis: IDR formatted (e.g. "50M", "100M")                   │
│  [5c] X-axis: Month abbreviation (Jan–Dec)                          │
│  [5d] Dot on each data point, highlighted on hover                  │
│  [5e] Responds to Month filter — selected month dot highlighted     │
│  [5f] Height: 280px                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ REVENUE MIX BY TRANSACTION TYPE                               [6]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ H2: "Revenue Mix — Outpatient vs Inpatient"                     │ │
│ │ Subtitle: "% of monthly revenue by transaction type"            │ │
│ │                                                                 │ │
│ │ 100% ▲ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        │ │
│ │      │ ░░░░ Inpatient (RI) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░        │ │
│ │      │ ████████████████████████████████████████████████        │ │
│ │      │ ████ Outpatient (RJ) ████████████████████████████       │ │
│ │  0%  └────────────────────────────────────────────────▶        │ │
│ │        Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec          │ │
│ │                                                                 │ │
│ │  Legend: ████ Outpatient  ░░░░ Inpatient                        │ │
│ │  [tooltip: Month | Outpatient: X% | Inpatient: Y%]              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [6a] Chart type: Recharts AreaChart, stacked, normalized to 100%  │
│  [6b] Two series: RJ (dark fill) and RI (light fill)               │
│  [6c] Shows composition shift — key insight driver                  │
│  [6d] Responds to Month and Product Type filters                    │
│  [6e] Height: 240px                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ SUMMARY TABLE                                                 [7]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ H2: "Monthly Performance Summary"                               │ │
│ │                                                                 │ │
│ │ Month  │ Revenue (IDR) │ Transactions │ Avg Margin % │ Mix RJ%  │ │
│ │ ─────────────────────────────────────────────────────────────  │ │
│ │ Jan    │ ~~~,~~~,~~~   │ ~~,~~~       │ ~~.~%        │ ~~%      │ │
│ │ Feb    │ ~~~,~~~,~~~   │ ~~,~~~       │ ~~.~%        │ ~~%      │ │
│ │ ...    │ ...           │ ...          │ ...          │ ...      │ │
│ │ Dec    │ ~~~,~~~,~~~   │ ~~,~~~       │ ~~.~%        │ ~~%      │ │
│ │ ─────────────────────────────────────────────────────────────  │ │
│ │ TOTAL  │ ~~~,~~~,~~~   │ ~~,~~~       │ ~~.~%        │ ~~%      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [7a] TanStack Table — sortable columns (click header to sort)      │
│  [7b] Conditional formatting: highest Revenue month → bold row      │
│  [7c] Margin % column: red text if below overall average            │
│  [7d] Total row always pinned at bottom                             │
│  [7e] Responds to all three filters                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layout — Mobile (390px)

```
┌────────────────────────────┐
│ NAV                  [≡]   │  Hamburger menu, full-screen overlay
├────────────────────────────┤
│ H1: Executive Overview     │
│ Subtitle (truncated 1 line)│
├────────────────────────────┤
│ FILTERS (stacked)          │
│ [Month ▼]                  │
│ [Transaction Type ▼]       │
│ [Product Type ▼]           │
├────────────────────────────┤
│ KPI CARD: Total Revenue    │  Full width
│ KPI CARD: Transactions     │  Full width
│ KPI CARD: Avg Margin %     │  Full width
├────────────────────────────┤
│ LINE CHART (Monthly Rev)   │  Full width, height 200px
│ X-axis: J F M A M J J...  │  Abbreviated to single char
├────────────────────────────┤
│ AREA CHART (Mix)           │  Full width, height 180px
├────────────────────────────┤
│ TABLE (horizontally scroll)│  Sticky month column
└────────────────────────────┘
```

---

## States

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton gray boxes replace KPI cards and charts while `overview.json` fetches |
| **Filter: specific month** | Line chart highlights that month's dot; table filters to single row; KPI cards show that month's values; delta hidden |
| **Filter: All (default)** | Full year view; KPI cards show annual totals; delta hidden |
| **Empty month selected** | Show "No transactions recorded for this month" — applies to 7 months without valid dates |
| **No data for filters** | Show "No data for selected filters" with icon and suggestion to try different filter values |

---

## Data Coverage Notes

> ⚠️ **Important**: The source dataset has limited date coverage. Only **5 out of 12 months** (January, March, April, August, September) have valid transaction dates. 92.4% of rows have no parseable date from NO_RESEP.
>
> - Line chart and area chart will show gaps for missing months
> - Summary table shows only months with valid dates
> - Month filter: selecting a month without data shows empty state message

## Annotations

| # | Element | Note |
|---|---------|------|
| 1 | Navigation | Active page ("Overview") visually distinguished — underline or bold. No icons in nav — text only for clarity |
| 2 | Page header | H1 is the only H1 on page. Subtitle provides date context immediately |
| 3 | Filters | Dropdowns, not toggles — consistent with Shadboard component library. Label above each dropdown. **Month filter**: months without data show "No data" on selection |
| 4 | KPI cards | Three equal-width cards in a row. Sparklines sourced from same monthly data as line chart. Delta vs previous month hidden when selected month has no data |
| 5 | Line chart | Single series only — do not add second series here. Mix chart (6) handles the split view. **Empty months**: show gap/break in line, not interpolated |
| 6 | Area chart | Stacked 100% — shows proportion, not absolute values. Pair with line chart (5) for full picture. Months without data show as 0% or hidden |
| 7 | Summary table | Gives exact numbers that charts approximate. Managers often want to screenshot this. **Shows only dated rows** — filtered to months with valid data |

---

## Content Specifications

| Element | Content Source | Format |
|---------|---------------|--------|
| Total Revenue | `overview.json → annual_revenue` | `Rp X,XXX,XXX,XXX` |
| Total Transactions | `overview.json → annual_transactions` | `XXX,XXX` |
| Avg Margin % | `overview.json → avg_margin_pct` | `XX.X%` |
| Monthly trend data | `overview.json → monthly[]` | Array of 12 objects |
| Mix data | `overview.json → monthly[].rj_pct, ri_pct` | Float 0–100 |
