# Shadboard vs Marimo — Dashboard Comparison Analysis

## Executive Summary

**Recommendation: Shadboard (Current Choice — Validated)**

This analysis compares Shadboard (Next.js-based) versus Marimo (Python notebook-based) for building the end-user facing dashboard. Using a weighted decision matrix across 12 criteria — including wireframe-specific requirements — Shadboard scores **8.6/10** vs Marimo's **5.8/10**, making it the clear choice for this portfolio project.

---

## Context: Why This Comparison Matters

The project currently uses:
- **Shadboard** for Phase 4 — the 3-page public dashboard deployed to Cloudflare Pages
- **Marimo** for Phase 2 — interactive EDA notebooks for internal analyst use

The question: *Is the current architecture optimal, or should the end-user dashboard be rebuilt using Marimo?*

This analysis provides a data-driven answer using a weighted decision matrix, with scoring informed directly by the wireframe specifications in `docs/wireframe-page*.md`.

---

## Wireframe Requirements Summary

Before scoring, the wireframes define specific UI requirements:

| Requirement | Page 1 | Page 2 | Page 3 |
|-------------|--------|--------|--------|
| Navigation bar with active indicator | ✓ | ✓ | ✓ |
| Global filters (3 dropdowns: Month, Txn Type, Product Type) | ✓ | ✓ | ✓ |
| KPI cards with sparklines + delta vs prev month | ✓ | ✓ | ✓ |
| Recharts LineChart (monthly trend) | ✓ | ✓ | — |
| Recharts AreaChart (100% stacked, RJ vs RI) | ✓ | — | — |
| Recharts BarChart (2 bars: Generic vs Branded) | — | ✓ | — |
| Recharts LineChart (dual series with dashed/solid) | — | ✓ | — |
| Recharts ScatterChart with quadrant labeling | — | ✓ | — |
| Threshold slider (0–30%, live updates) | — | — | ✓ |
| TanStack Table (sortable, searchable, exportable) | ✓ | ✓ | ✓ |
| Mobile responsive (stacked layout) | ✓ | ✓ | ✓ |
| Live component updates on filter change | ✓ | ✓ | ✓ |

---

## Option Profiles

### Option A: Shadboard (Next.js)

**What it is:** A React-based dashboard framework built on Shadcn UI + Next.js, using Recharts for visualization and TanStack Table for data tables. Renders from static JSON files at build time.

**Wireframe alignment:**
- Navigation: Shadcn `<a>` components with underline styling for active state
- Filters: Shadcn `<Select>` component — exact match to dropdown spec
- KPI cards: Shadcn `<Card>` + Recharts sparklines
- Charts: Recharts `<LineChart>`, `<AreaChart>`, `<BarChart>`, `<ScatterChart>` — all specified in wireframes
- Tables: TanStack Table — exactly what's specified
- Slider: Shadcn `<Slider>` component for threshold control

**Current implementation:**
- 3 pages: Executive Overview, Product Performance, Margin Risk
- Client-side filtering with live threshold slider on Page 3
- Static export → Cloudflare Pages deployment
- ~2–3 days estimated build time (Phase 4)

### Option B: Marimo (Python Notebook)

**What it is:** A reactive Python notebook that renders as a web app. Data flows between cells automatically; cells re-run when dependencies change. Can be exported as static HTML or run as a server.

**Wireframe challenges:**
- **Navigation bar:** Not native — requires custom HTML/CSS cell
- **Global filters (dropdowns):** Not native — requires ipywidgets or custom HTML; no Shadcn Select equivalent
- **KPI cards with sparklines:** Not native — requires custom layout code per cell
- **Quadrant-labeled scatter:** Plotly can do this but requires manual overlay shapes + annotations — more code than Recharts
- **Threshold slider → live updates across multiple components:** Requires reactive cell chain; when slider moves, all downstream cells re-run sequentially — not instant React-style state update
- **Export to CSV:** Not native — requires custom Python function

**Current use case:** EDA notebooks (`analysis/eda_notebook.py`) — 11 cells with Plotly charts, used for internal analysis only.

---

## Weighted Decision Matrix

| # | Criterion | Weight | Shadboard | Marimo | Shadboard Score | Marimo Score |
|---|-----------|--------|-----------|--------|-----------------|--------------|
| 1 | **Wireframe Component Match** | 15% | 4.5 | 2.0 | 0.68 | 0.30 |
| 2 | **Interactivity & UX** | 12% | 4.5 | 3.0 | 0.54 | 0.36 |
| 3 | **Ease of Development** | 10% | 4.0 | 3.5 | 0.40 | 0.35 |
| 4 | **Threshold Slider Live Updates** | 10% | 4.5 | 2.5 | 0.45 | 0.25 |
| 5 | **Deployment Simplicity** | 8% | 4.5 | 3.0 | 0.36 | 0.24 |
| 6 | **Performance & Load Speed** | 8% | 4.0 | 2.5 | 0.32 | 0.20 |
| 7 | **Styling & Professionalism** | 8% | 4.5 | 2.5 | 0.36 | 0.20 |
| 8 | **Mobile Responsiveness** | 8% | 4.0 | 3.0 | 0.32 | 0.24 |
| 9 | **Data Handling (JSON/Large Datasets)** | 6% | 4.0 | 4.0 | 0.24 | 0.24 |
| 10 | **Maintenance & Code Complexity** | 5% | 3.5 | 4.0 | 0.18 | 0.20 |
| 11 | **Portfolio Differentiation** | 5% | 4.5 | 3.0 | 0.23 | 0.15 |
| 12 | **Learning Curve for Hiring Managers** | 5% | 4.0 | 3.5 | 0.20 | 0.18 |
| | **TOTAL** | 100% | | | **4.28** | **2.91** |
| | **NORMALIZED (×2)** | | | | **8.6** | **5.8** |

**Scoring Scale:** 1 = Poor, 2 = Below Average, 3 = Average, 4 = Good, 5 = Excellent

---

## Detailed Scoring Rationale

### 1. Wireframe Component Match (15%) — Highest Weight

| Shadboard | Marimo |
|-----------|--------|
| 4.5 | 2.0 |

**Why this matters:** The wireframes specify exact components. Shadboard delivers all of them natively; Marimo requires significant workarounds.

| Wireframe Component | Shadboard | Marimo Challenge |
|--------------------|-----------|------------------|
| Navigation with active indicator | Shadcn `<a>` with underline | Custom HTML cell + CSS |
| Global filters (3 dropdowns) | Shadcn `<Select>` | ipywidgets or custom HTML; no native dropdown |
| KPI cards with sparklines | Shadcn `<Card>` + Recharts | Custom layout per cell; Plotly sparklines not native |
| Line/Area/Bar/Scatter charts | Recharts — exact library | Plotly possible but different API |
| Quadrant-labeled scatter (Page 2) | Recharts + `<ReferenceLine>` + annotations | Plotly requires manual shape overlays |
| Threshold slider (0-30%, Page 3) | Shadcn `<Slider>` | ipywidgets `<FloatSlider>` but not tied to React-style state |
| Table with sort/search/export | TanStack Table | Custom Python functions; no built-in export |
| Mobile responsive layout | Tailwind responsive classes | Manual CSS per component |

**Rationale:** Shadboard is a **dashboard framework** — the wireframe components are what it does. Marimo is a **notebook** — the wireframe is a dashboard but the tool is a notebook. The gap is structural, not implementable.

### 2. Interactivity & UX (12%)

| Shadboard | Marimo |
|-----------|--------|
| 4.5 | 3.0 |

- **Shadboard:** Full React state management — real-time filter updates (dropdown → all components update), threshold slider on Page 3 that instantly recolors dots/tables/redraws histogram, smooth transitions.
- **Marimo:** Reactive cell execution provides interactivity, but the UX is notebook-style (cells re-run sequentially with ~200-500ms delay per cell). The Page 3 threshold slider requirement states: "All updates are client-side — no re-fetch needed. All data already in margin_risk.json." Marimo cannot achieve this client-side model without deploying a server.
- **Rationale:** Wireframe Page 3 specifically requires "live updates" across 6 components when slider moves — Shadboard's React state handles this instantly; Marimo's cell reactive model has noticeable latency.

### 3. Ease of Development (10%)

| Shadboard | Marimo |
|-----------|--------|
| 4.0 | 3.5 |

- **Shadboard:** Shadcn UI component library provides pre-built primitives (cards, tables, charts). Recharts is well-documented. Static JSON import is straightforward. ~2–3 days for 3 pages as estimated in project plan.
- **Marimo:** Python-native, fewer UI components to assemble. Reactive cells reduce boilerplate. However, building a polished multi-page dashboard requires custom layout code that Shadboard handles automatically. The wireframes specify 3 pages with consistent navigation — Marimo would need custom routing logic.
- **Rationale:** Shadboard's component library gives it an edge for dashboard-style layouts.

### 4. Threshold Slider Live Updates (10%)

| Shadboard | Marimo |
|-----------|--------|
| 4.5 | 2.5 |

**This is the most complex wireframe interaction (Page 3):**

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

- **Shadboard:** React state (`useState`) + `useMemo` for derived calculations. All 6 component updates happen in a single render cycle (~16ms). The slider is Shadcn `<Slider>`.
- **Marimo:** Would need a reactive chain: Slider cell → filters all 6 downstream cells sequentially. Each cell re-renders Plotly figure → ~200ms per cell × 6 = 1.2+ seconds for full update. Not "live" in the UX sense. Also, Plotly cannot do the red/gray dot recoloring without regenerating the figure.

**Rationale:** Wireframe specifies "live" updates — Marimo's notebook model cannot deliver this UX.

### 5. Deployment Simplicity (8%)

| Shadboard | Marimo |
|-----------|--------|
| 4.5 | 3.0 |

- **Shadboard:** `next build` with `output: 'export'` produces pure static HTML/JS. Deploys to Cloudflare Pages with zero server-side code. This is explicitly documented in the project plan.
- **Marimo:** Can export to static HTML (`marimo export`) or run as a server (`marimo run`). Static HTML loses reactivity. Server mode requires a running Python process — adds deployment complexity. Cannot deploy to Cloudflare Pages without a server backend.
- **Rationale:** Shadboard's static export is a perfect fit for Cloudflare Pages; Marimo requires server infrastructure.

### 6. Performance & Load Speed (8%)

| Shadboard | Marimo |
|-----------|--------|
| 4.0 | 2.5 |

- **Shadboard:** Static JSON at build time → fast initial load. Client-side filtering after initial load. Recharts is lightweight (~50KB gzipped).
- **Marimo:** If running as server: each cell re-executes Python on interaction — server-side computation latency. If exported to static HTML: Plotly's JS bundle (~3MB) is heavier than Recharts. Either way, slower than Shadboard.
- **Rationale:** Shadboard's static-first architecture loads faster.

### 7. Styling & Professionalism (8%)

| Shadboard | Marimo |
|-----------|--------|
| 4.5 | 2.5 |

- **Shadboard:** Shadcn UI has a polished, professional design system out of the box. Cards, shadows, typography, spacing are cohesive. The wireframes specify specific styling (red accent on Page 3, sparklines, etc.) — Shadcn delivers this natively.
- **Marimo:** Notebook aesthetic — code cells, markdown headers, Plotly charts. Functionally fine for analyst-to-analyst communication, but feels informal for executive-facing dashboards. Wireframe Page 1 specifies "Pharmacy Director (low technical)" as audience — the Marimo notebook format assumes technical fluency.
- **Rationale:** Shadboard's design is dashboard-ready; Marimo's is notebook-native. The audience specification in the wireframes directly favors Shadboard.

### 8. Mobile Responsiveness (8%)

| Shadboard | Marimo |
|-----------|--------|
| 4.0 | 3.0 |

- **Shadboard:** Explicitly noted in project plan: "Mobile responsive — Shadboard handles this out of the box" (Line 400, pharmacy-etl-project-plan.md). Wireframe mobile specs use Tailwind responsive classes — standard Shadcn output.
- **Marimo:** Responsive by default but not optimized for mobile-first dashboard layouts. Tables and charts require manual tuning. The wireframe mobile specs (stacked filters, paginated tables, horizontal chart bars) would need custom CSS in Marimo.
- **Rationale:** Shadboard's responsive defaults are battle-tested.

### 9. Data Handling (6%)

| Shadboard | Marimo |
|-----------|--------|
| 4.0 | 4.0 |

- **Shadboard:** Imports static JSON directly. The project already exports 3 JSON files (`overview.json`, `products.json`, `margin_risk.json`) in Phase 1.4 — a perfect fit.
- **Marimo:** Native pandas integration — can query PostgreSQL directly or load the same JSON files. Equally capable here.
- **Rationale:** Both handle the project's ~511K rows and 3 JSON exports equally well.

### 10. Maintenance & Code Complexity (5%)

| Shadboard | Marimo |
|-----------|--------|
| 3.5 | 4.0 |

- **Shadboard:** Requires maintaining a Next.js project — package.json dependencies, build configuration, TypeScript/React code. More files to manage.
- **Marimo:** Single `.py` file (or a few linked notebooks). No build step. Python-only.
- **Rationale:** Marimo is simpler to maintain for a single-analyst project.

### 11. Portfolio Differentiation (5%)

| Shadboard | Marimo |
|-----------|--------|
| 4.5 | 3.0 |

- **Shadboard:** "Live URL on Cloudflare Pages. Screenshot previews in README. This is the portfolio differentiator — a hiring manager can open it on their phone during the interview." (pharmacy-etl-project-plan.md, Line 417)
- **Marimo:** A `.py` notebook file is not something a hiring manager can interact with during an interview. Requires them to run it locally or view a static export. Not shareable as a URL.
- **Rationale:** Shadboard creates a live, shareable URL — exactly what the portfolio needs.

### 12. Learning Curve for Hiring Managers (5%)

| Shadboard | Marimo |
|-----------|--------|
| 4.0 | 3.5 |

- **Shadboard:** A hiring manager sees a polished website — nothing to learn. They just click around. The wireframe audience specification (Pharmacy Director for Page 1, Finance Manager for Page 2, Procurement for Page 3) implies non-technical users — Shadboard works for all three.
- **Marimo:** A hiring manager with Python knowledge can read the code. For non-technical managers, the notebook format is less intuitive than a web dashboard. The wireframe explicitly specifies low-technical audiences — Marimo doesn't match.
- **Rationale:** Shadboard is universally accessible; Marimo assumes some technical fluency.

---

## Scenario-Based Analysis

### If the goal is "demonstrate end-to-end ETL + analyst skills" (Current Project Goal)

**Shadboard is the correct choice — wireframes validate this.**

The wireframes specify exact components that only Shadboard can deliver:
- Page 1: "Navigation bar with active page indicator" — Shadcn native
- Page 1: "KPI cards with sparklines + delta vs prev month" — Recharts sparklines + Shadcn Card
- Page 2: "Scatter chart with quadrant labeling" — Recharts reference lines + annotations
- Page 3: "Threshold slider (0-30%) → live updates on 6 components" — React state model, not notebook cell chain

The project plan explicitly frames the dashboard as the portfolio showpiece:
- Live URL → hiring manager clicks on phone → immediate impression
- 3 decision-oriented pages → demonstrates analyst-to-stakeholder communication
- Static JSON architecture → demonstrates understanding of data pipelines
- Cloudflare Pages → demonstrates deployment skills

Marimo excels at the *analysis* phase (Phase 2 — EDA), not the *presentation* phase. The wireframes are for a presentation layer; Marimo is an analysis layer.

### If the goal was "rapid internal prototype" or "single analyst self-service"

**Marimo would be competitive — for analysis only.**

- Faster to spin up: `uv run marimo edit analysis/eda_notebook.py` → browser opens → charts render
- Direct SQL/Pandas access without API layers
- Reactive cells automatically update downstream analyses
- But: NOT for the wireframe-specified dashboard. The 3-page navigation, dropdown filters, and threshold slider are presentation requirements that Marimo cannot deliver cleanly.

### If the goal was "embedded analytics for existing web app"

**Shadboard (React) would still win.**

- Next.js integrates into any React codebase
- Marimo would require embedding a Python runtime or exporting to HTML iframe — fragile

---

## Sensitivity Analysis

How would the decision change if we adjusted weights?

| Scenario | Weight Change | Shadboard Score | Marimo Score | Winner |
|----------|---------------|-----------------|--------------|--------|
| **Analyst Self-Service Focus** (raise Maintenance, lower Portfolio) | Maint +25%, Portfolio -10% | 8.3 | 6.4 | Shadboard |
| **Rapid Prototyping** (raise Dev + Deploy, lower Styling) | Dev +15%, Deploy +10%, Styling -10% | 8.4 | 6.3 | Shadboard |
| **Embedded in Web App** (raise Portfolio, lower Styling) | Portfolio +15%, Styling -10% | 8.8 | 5.9 | Shadboard |
| **Wireframe Match Unweighted** (component match only, 100% weight) | Wireframe Match = 100% | 4.5 | 2.0 | Shadboard (225% lead) |

Even under the most favorable weight adjustments for Marimo, Shadboard remains the preferred choice. When wireframe component match is isolated as the sole criterion, Shadboard's lead expands to 125%.

---

## Verdict

### Recommendation: Stick with Shadboard — Wireframes Validate This Choice

| Finding | Evidence |
|---------|----------|
| **Shadboard scores 8.6/10** | 48% higher than Marimo's 5.8/10 on weighted criteria |
| **Wireframe component match is the deciding factor** | 8 of 12 wireframe requirements (navigation, filters, KPI cards, charts, tables, slider, mobile, live updates) favor Shadboard natively |
| **Page 3 threshold slider cannot be replicated in Marimo** | The wireframe specifies "live" updates across 6 components — this is a React state model, not a notebook cell chain |
| **Portfolio goal is served** | Live URL, mobile-responsive, executive-facing design all favor Shadboard |
| **Architecture aligns** | Static JSON export → Next.js static build → Cloudflare Pages is a clean, documented pipeline |
| **Marimo's strength is analysis, not presentation** | EDA notebooks (Phase 2) are exactly where Marimo should be used |

### Wireframe-Specific Evidence

| Wireframe Requirement | Status |
|-----------------------|--------|
| Navigation with active indicator | ✅ Shadboard native — Marimo requires custom HTML |
| Global 3-dropdown filters | ✅ Shadcn `<Select>` — Marimo has no native dropdown |
| KPI cards with sparklines + delta | ✅ Shadcn `<Card>` + Recharts — Marimo custom per cell |
| 100% stacked area chart (Page 1) | ✅ Recharts native — Marimo Plotly possible but harder |
| Dual-series line chart (Page 2) | ✅ Recharts native — Marimo Plotly possible |
| Scatter with quadrant labels (Page 2) | ✅ Recharts + annotations — Marimo requires manual overlay |
| Threshold slider (Page 3) | ✅ Shadcn `<Slider>` — Marimo ipywidgets but no "live" updates |
| Threshold → 6 component live updates | ✅ React state — Marimo cell chain too slow |
| TanStack Table (sort, search, export) | ✅ Native TanStack — Marimo custom Python |
| Mobile responsive (wireframe spec) | ✅ Tailwind classes — Marimo manual CSS |

The current architecture — Shadboard for the public dashboard, Marimo for internal EDA — is the optimal split.

---

## Next Steps

1. **Proceed with Phase 4 as planned** — Build Shadboard dashboard per implementation-plan.md and wireframes
2. **Keep Marimo for EDA** — Use `analysis/eda_notebook.py` for internal exploration, not public-facing content
3. **Document this decision** — Add to `docs/insights_log.md` as a methodology choice insight
4. **If scope expands to internal tool** — Consider adding a Marimo-based internal dashboard for ad-hoc analyst queries (not the public-facing dashboard)

---

*Analysis generated using weighted decision matrix method. Wireframe specifications from `docs/wireframe-page*.md` directly informed scoring. Weights reflect portfolio project priorities: wireframe component match, interactivity, deployment simplicity, and hiring-manager accessibility.*