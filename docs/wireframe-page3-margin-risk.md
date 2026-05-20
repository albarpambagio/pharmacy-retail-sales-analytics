# Wireframe Spec — Page 3: Margin Risk
**Fidelity:** Annotated Mid-Fi  
**Audience:** Finance Analyst, Procurement (more technical)  
**Decision Enabled:** "Which SKUs need pricing or procurement review before 2016?"  
**Data Source:** `margin_risk.json`

---

## Layout — Desktop (1280px)

```
┌─────────────────────────────────────────────────────────────────────┐
│ NAVIGATION                                                    [1]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🏥 Pharmacy Analytics  [Overview] [Products] [Margin Risk]      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│  "Margin Risk" active (underlined)                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                   [2]   │
│  H1: "Margin Risk"                                                  │
│  Subtitle: "High-Volume SKUs with Thin Margins · 2015"              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ GLOBAL FILTERS                                                [3]   │
│ ┌───────────────┐  ┌─────────────────────┐  ┌──────────────────┐  │
│ │ Month [All ▼] │  │ Transaction Type[▼] │  │ Product Type [▼] │  │
│ └───────────────┘  └─────────────────────┘  └──────────────────┘  │
│                                                                     │
│  + MARGIN THRESHOLD CONTROL (page-specific filter):                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Flag SKUs below: [──●──────] 10%    Range: 0%–30%           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [3a] Threshold slider — unique to this page, not in global nav    │
│  [3b] Default: 10%. User can drag to change threshold               │
│  [3c] All components on page react to slider in real time           │
│  [3d] Threshold value shown as numeric label next to slider         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ RISK SUMMARY KPI CARDS                                        [4]   │
│ ┌──────────────────────┐ ┌──────────────────┐ ┌─────────────────┐ │
│ │ ⚠ AT-RISK SKUs       │ │ REVENUE AT RISK  │ │ AVG MARGIN %    │ │
│ │                      │ │                  │ │ (AT-RISK SKUs)  │ │
│ │       [~~]           │ │  Rp [~~~,~~~]    │ │    [~.~%]       │ │
│ │  below ~~% threshold │ │  ~~% of total    │ │                 │ │
│ └──────────────────────┘ └──────────────────┘ └─────────────────┘ │
│                                                                     │
│  [4a] "At-Risk SKUs" count updates live when threshold slider moves │
│  [4b] "Revenue at Risk" = sum of revenue for flagged SKUs           │
│  [4c] "~~% of total" = flagged SKU revenue / total pharmacy revenue │
│  [4d] Warning icon (⚠) on first card only — draws attention        │
│  [4e] All three cards use red accent when values are high           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ VOLUME vs MARGIN SCATTER                                      [5]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ H2: "Transaction Volume vs Margin % — All SKUs"                 │ │
│ │ Subtitle: "Red = below threshold. Size = revenue."              │ │
│ │                                                                 │ │
│ │  Margin% ▲                                                      │ │
│ │          │  ·  ·   · ·    ·    ·  ·   ·  ·                    │ │
│ │   High   │     ·      ·    · ·   · ·  ·                        │ │
│ │          │  ·    · ·    ·         ·                             │ │
│ │ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ threshold line ─ ─ ─   │ │
│ │          │ ● ●  ● ●   ●  ●  ●  ●   ●                           │ │
│ │   Low    │  ●  ●   ●   ●     ●    ●  ●                          │ │
│ │          │                                                      │ │
│ │          └──────────────────────────────────────────────────▶  │ │
│ │                  Transaction Count (volume)                     │ │
│ │                                                                 │ │
│ │  Legend: ● At-risk (below threshold)  · Safe  (above threshold) │ │
│ │          Dot size = revenue                                     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [5a] Chart type: Recharts ScatterChart                             │
│  [5b] X-axis: transaction count. Y-axis: margin %                  │
│  [5c] Dot size: bucketed by revenue (small/medium/large)            │
│  [5d] Dot color: RED if margin% < threshold, GRAY if above         │
│  [5e] Dashed horizontal threshold line moves with slider            │
│  [5f] Hover tooltip: SKU code | Margin % | Revenue | Transactions   │
│  [5g] Height: 300px                                                 │
│  [5h] Large red dots in lower-left = highest priority to fix        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ MARGIN DISTRIBUTION HISTOGRAM                                 [6]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ H2: "SKU Margin % Distribution"                                 │ │
│ │ Subtitle: "How many SKUs fall in each margin band?"             │ │
│ │                                                                 │ │
│ │ # SKUs ▲                                                        │ │
│ │        │ ███                                                    │ │
│ │        │ ████ ██                                                │ │
│ │        │ ████████ ██                                            │ │
│ │        │ ████████████ ██   █                                    │ │
│ │        └────────────────────────────────────────────────────▶  │ │
│ │          0%  5% 10% 15% 20% 25% 30% 35% 40%+  Margin %        │ │
│ │               ↑                                                 │ │
│ │          threshold line (dashed red, moves with slider)         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [6a] Chart type: Recharts BarChart used as histogram               │
│  [6b] Bars left of threshold line: red fill                         │
│  [6c] Bars right of threshold: gray fill                            │
│  [6d] Threshold line animates when slider moves                     │
│  [6e] Height: 200px                                                 │
│  [6f] Gives the analyst a sense of the distribution shape           │
│       before reviewing the detail table                             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AT-RISK SKU DETAIL TABLE                                      [7]   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ H2: "At-Risk SKUs"   [~~] SKUs shown   [Search...] [Export CSV]│ │
│ │                                                                 │ │
│ │ SKU Code │ Type    │ Txn Type│ Txns  │ Revenue(IDR)│ Margin%│  │ │
│ │ ─────────┼─────────┼─────────┼───────┼─────────────┼────────   │ │
│ │ R-~~~~   │ Branded │   RJ    │ ~,~~~ │ ~~~,~~~,~~~ │ ⚠ ~.~% │  │ │
│ │ AI-~~~~  │ Generic │   RI    │ ~,~~~ │ ~~~,~~~,~~~ │ ⚠ ~.~% │  │ │
│ │ R-~~~~   │ Branded │   RJ    │ ~,~~~ │ ~~~,~~~,~~~ │ ⚠ ~.~% │  │ │
│ │ ...      │ ...     │ ...     │ ...   │ ...         │ ...     │  │ │
│ │                                                                 │ │
│ │ ─────────────────────────────────────────────────────────────  │ │
│ │ TOTALS   │         │         │ ~,~~~ │ ~~~,~~~,~~~ │          │  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  [7a] Only shows SKUs below threshold — auto-filtered               │
│  [7b] Default sort: Revenue descending (highest revenue at risk top)│
│  [7c] All columns sortable                                          │
│  [7d] Margin % column: always red text + ⚠ icon (all rows flagged) │
│  [7e] Type column: pill badge Generic / Branded                     │
│  [7f] Txn Type column: RJ / RI — helps procurement understand       │
│       channel (inpatient margins structurally differ)               │
│  [7g] SKU count in header updates live with slider                  │
│  [7h] Export CSV includes all visible columns                       │
│  [7i] Totals row: sum of Txns + Revenue for at-risk SKUs only       │
│  [7j] TanStack Table component                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layout — Mobile (390px)

```
┌────────────────────────────┐
│ NAV                  [≡]   │
├────────────────────────────┤
│ H1: Margin Risk            │
│ Subtitle (1 line)          │
├────────────────────────────┤
│ FILTERS (stacked)          │
│ [Month ▼]                  │
│ [Transaction Type ▼]       │
│ [Product Type ▼]           │
│ Threshold: [──●──] 10%     │
├────────────────────────────┤
│ KPI: At-Risk SKUs    ⚠     │
│ KPI: Revenue at Risk       │
│ KPI: Avg Margin % (risk)   │
├────────────────────────────┤
│ SCATTER (Vol vs Margin)    │
│ Full width, height 240px   │
│ Pinch to zoom              │
├────────────────────────────┤
│ HISTOGRAM (distribution)   │
│ Full width, height 160px   │
├────────────────────────────┤
│ TABLE (at-risk SKUs)       │
│ Scroll horizontal          │
│ Sticky SKU code column     │
│ Paginated: 10 rows/page    │
└────────────────────────────┘
```

---

## States

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton placeholders for all charts and table |
| **Slider at 0%** | Zero at-risk SKUs; KPI cards show 0; table shows empty state: "No SKUs below this threshold" |
| **Slider at 30%** | Most SKUs flagged; scatter mostly red; KPI "Revenue at Risk" = large proportion of total |
| **Default (10%)** | Expected: only 23 SKUs (1%) at risk — low systemic risk |
| **Filter: specific month without data** | Recalculate based on filtered data; may show fewer at-risk SKUs |
| **Filter: Transaction Type = Inpatient** | Recalculates only for RI transactions — useful because RI structurally has different margin profile |
| **Table row hover** | Corresponding dot in scatter chart highlighted with ring |
| **Export triggered** | CSV download of currently visible at-risk SKUs with all columns |

---

## Data Coverage Notes

> ⚠️ **Important**: Only **5 out of 12 months** have valid transaction dates. This affects transaction count metrics in scatter plot and table.

## Annotations

| # | Element | Note |
|---|---------|------|
| 3 | Threshold slider | Page-specific filter, placed below global filters. Label clearly to distinguish from global filters. This is the most interactive element in the project — test it thoroughly |
| 4 | Risk KPI cards | These intentionally use red accent — this page has a different visual tone than pages 1 and 2. Risk = urgency |
| 5 | Scatter | Red/gray binary color — simpler than Page 2 scatter. All dots are either at-risk (red) or safe (gray). Size = revenue so biggest financial risks are visually largest |
| 6 | Histogram | Analytical support for the scatter. Shows whether the at-risk cluster is an outlier or a large portion of the SKU base. Often the most surprising visual on this page |
| 7 | Table | Primary deliverable for procurement. They will screenshot or export this. Make the export button easy to find |

---

## Key Interaction: Threshold Slider → Live Updates

The slider is the defining UX of this page. When user drags it:

```
Slider value changes
  → KPI card "At-Risk SKUs" recalculates count
  → KPI card "Revenue at Risk" recalculates sum
  → KPI card "Avg Margin %" recalculates average
  → Scatter: dots below new threshold turn red, dots above turn gray
  → Scatter: dashed threshold line moves to new Y position
  → Histogram: bars left of new value turn red, right turn gray
  → Table: rows re-filter to show only SKUs below new threshold
  → Table header count updates
```

All updates are client-side — no re-fetch needed. All data already in `margin_risk.json`.

---

## Content Specifications

| Element | Content Source | Format |
|---------|---------------|--------|
| At-risk count | Calculated client-side from `margin_risk.json → skus[]` where `margin_pct < threshold` | Integer |
| Revenue at risk | Sum of `revenue` for flagged SKUs | `Rp X,XXX,XXX,XXX` |
| % of total revenue | `revenue_at_risk / margin_risk.json → total_revenue` | `XX.X%` |
| Scatter data | `margin_risk.json → skus[]` | `{kd_obat, type, txn_type, txn_count, revenue, margin_pct}` |
| Histogram bins | Pre-computed in `export_json.py` in 5% bands | `{band: "0-5%", count: N}` |
| Detail table | Same `skus[]` array, client-side filtered by threshold | Sorted by revenue desc |
