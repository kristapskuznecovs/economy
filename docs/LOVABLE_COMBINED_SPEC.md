# Latvia Fiscal Flow Dashboard - Combined Frontend Specification (Lovable)

## Merge Policy

This document combines:
- `LOVABLE_FISCAL_FLOW_SPEC.md` (newer, **authoritative**)
- `LOVABLE_FRONTEND_SPEC.md` (older, used for non-conflicting implementation details)

Conflict rule:
- If sections conflict, `LOVABLE_FISCAL_FLOW_SPEC.md` wins.
- Conversational simulation from the older spec is now elevated to core UX, but only as a control layer on top of fiscal-flow views.

---

## User Need

"I need to see government budget flows: where money comes from (taxes by region) and where it goes (spending by category/region), with a Sankey diagram and a large Latvia map for regional fiscal balance. I also need one simple chat input where I can ask policy questions (for example, removing the 2nd pension pillar) and instantly get budget and economy effects for year 1, year 5, and year 15 with model-based predictions."

Target users:
- Policy analysts
- Economists
- Public finance stakeholders

---

## Project Overview

Build a clear fiscal transparency dashboard focused on:
1. Revenue sources (regional taxes + non-tax sources)
2. Budget expenditures (COFOG categories + projects)
3. Flow visualization (Sankey: revenue -> spending)
4. Regional fiscal balance (taxes paid vs budget received)
5. Conversational policy simulation that orchestrates all data/APIs and applies scenario changes to the dashboard

Primary product identity:
- Fiscal flow dashboard with model-assisted scenario simulation

---

## Tech Stack

- Next.js 14 + React + TypeScript
- Shadcn/ui + Tailwind CSS
- `react-simple-maps` for Latvia choropleth map
- Sankey library (`react-sankey-component` or fallback: custom SVG / React Flow)
- Zustand for app state
- TanStack Query for API fetching/caching
- Recharts (optional v2 for trend charts)

---

## Layout: Question-First Modern Structure

Desktop:
- Header at top
- Row 1 (Primary Action): persistent "Ask Fiscal AI" input + quick prompt chips
- Row 2 (Immediate Answer): 1/5/15 year impact cards (budget, economy, investment)
- Row 3 (Explanation): "Why this happens" causal chain and key drivers
- Row 4 (Evidence): Sankey (flows) + map (regional impacts) in a 2-column grid
- Row 5 (Details): revenue panel + expenditure panel + assumptions/confidence drawer

Responsive behavior:
- Desktop (`>=1280px`): row-based layout above
- Tablet (`768-1279px`): Ask + horizon cards first, visuals stacked, details collapsible
- Mobile (`<768px`): tabs (`Ask`, `Impact`, `Why`, `Map`, `Flow`, `Details`) with sticky ask bar

---

## Section 1: Revenue Sources (Money In)

Core requirements:
- Region-level tax revenue rows with checkboxes to include/exclude from visualizations
- Other revenue sources (EU funds, borrowing, others) with toggles
- Subtotals and total revenue

Essential fields:
- Region name
- Amount (EUR million)
- Share of national revenue (%)
- Source enabled/disabled

Behavior:
- Toggling a source updates Sankey links and totals immediately

---

## Section 2: Budget Expenditures (Money Out)

Core requirements:
- COFOG category allocation list
- Specific project lines (add/edit/remove)
- Total expenditure and deficit/surplus indicator

Essential fields:
- Category label + COFOG code
- Amount (EUR million)
- Percentage of total expenditure
- Optional funding attribution (e.g., EU funds, borrowing)

Behavior:
- Editing allocations updates Sankey node values and fiscal balance calculations

---

## Section 3: Sankey Diagram (Revenue -> Expenditure)

Core requirements:
- Left nodes: revenue sources (regional taxes + non-tax sources)
- Right nodes: expenditure categories + specific projects
- Links encode flow values (EUR million)

Interactions:
- Hover flow: exact value tooltip
- Click node: highlight connected links
- Respect source/category toggles from side panels

Fallback:
- If Sankey package is unstable, implement MVP with custom SVG/React Flow links

---

## Section 4: Large Latvia Map (Regional Fiscal Balance)

Core requirements:
- Full-width interactive map of Latvia regions
- Choropleth color scale by fiscal balance
- Region click opens detail panel below map

Canonical metric definition:
- `balance = budget_received - taxes_paid`

Map legend:
- Strong net receiver
- Moderate net receiver
- Balanced
- Moderate net contributor
- Strong net contributor

Region detail panel must include:
- Taxes paid (total + % of national)
- Budget received (total + % of national)
- Fiscal balance
- Spending breakdown (health, education, infrastructure, etc.)
- Coverage examples (e.g., hospital costs vs local taxes)

---

## Section 5: Header and Global UX

Header requirements:
- Product title: "Latvia Government Budget Flow Dashboard"
- Navigation links (home, saved views/scenarios, docs)
- Data quality/freshness badge with tooltip details
- Settings action
- Global chat input with placeholder: "Ask a fiscal question (e.g., simulate 2nd pension pillar removal)"

UX principles:
- Clear fiscal storytelling over complex controls
- Immediate visual feedback after edits/toggles
- Consistent units (`EUR million`)
- Chat-first simplicity: user can start with one prompt instead of manual editing
- Progressive disclosure: show high-level answer first, detailed tables/charts second
- One-screen comprehension: user should understand short-term vs long-term in under 20 seconds
- Linked evidence: each claim in chat maps to at least one visual element
- Every assistant answer must include:
  - What scenario changes were applied
  - Budget impact in 1, 5, 15 years
  - Macro impact in 1, 5, 15 years (GDP, employment, inflation)
  - Regional impact by Latvia area (increase/decrease values)
  - Investment impact (public/private, domestic/FDI, by horizon)
  - Model/assumption summary and confidence level

---

## Section 6: State Management (Zustand)

Recommended store shape:

```ts
interface RevenueSource {
  id: string;
  label: string;
  amount_eur_m: number;
  enabled: boolean;
  type: 'regional_tax' | 'eu_funds' | 'borrowing' | 'other';
}

interface ExpenditureItem {
  id: string;
  label: string;
  cofog?: string;
  amount_eur_m: number;
  kind: 'category' | 'project';
  funded_by?: 'eu_funds' | 'borrowing' | 'taxes' | 'reallocation';
}

interface AppState {
  revenueSources: RevenueSource[];
  expenditures: ExpenditureItem[];
  selectedRegion: string | null;
  sankey: { nodes: SankeyNode[]; links: SankeyLink[] } | null;
  regionalData: Record<string, RegionalFiscalData>;
  dataQuality: DataQuality | null;
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  activeScenario: ScenarioResult | null;
  isLoading: boolean;

  toggleRevenueSource: (id: string, enabled: boolean) => void;
  updateExpenditure: (id: string, amount_eur_m: number) => void;
  addProject: (project: ExpenditureItem) => void;
  selectRegion: (region: string | null) => void;
  refreshDashboard: () => Promise<void>;
  askFiscalAssistant: (prompt: string) => Promise<void>;
}
```

Optional v2 modules from older spec:
- Saved scenarios

---

## Section 7: API Integration

Core API endpoints (from fiscal spec):

```http
GET /api/regional-fiscal-balance
GET /api/budget-flows
POST /api/update-budget
GET /api/data-quality
POST /api/chat/query
POST /api/simulate-policy
GET /api/model-metadata
```

Optional v2 endpoints:

```http
GET /api/scenarios
POST /api/scenarios
```

Recommended integration approach:
- TanStack Query for reads (`regional-fiscal-balance`, `budget-flows`, `data-quality`)
- Mutation handlers for budget/project updates
- Optimistic UI updates where safe
- `POST /api/chat/query` acts as orchestrator:
  - Parses natural-language policy request
  - Calls simulation/model services
  - Returns structured impacts for horizons 1/5/15 years
  - Returns patched budget/expenditure/revenue deltas for UI rendering

---

## Section 8: TypeScript Interfaces

```ts
export interface RegionalFiscalData {
  region: string;
  taxes_paid: number;
  taxes_percentage: number;
  labor_tax: number;
  vat: number;
  corporate_tax: number;
  budget_received: number;
  budget_percentage: number;
  health_spending: number;
  education_spending: number;
  infrastructure_spending: number;
  hospital_costs: number;
  balance: number; // budget_received - taxes_paid
}

export interface SankeyNode {
  id: string;
  title: string;
  color: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number; // EUR million
}

export interface DataQuality {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  sources: Array<{ name: string; freshness_days: number }>;
}

export interface HorizonImpact {
  year: 1 | 5 | 15;
  budget_balance_eur_m: number;
  revenues_eur_m: number;
  expenditures_eur_m: number;
  gdp_real_pct: number;
  employment_jobs: number;
  inflation_pp: number;
}

export interface RegionalAreaImpact {
  area: 'Riga' | 'Pieriga' | 'Kurzeme' | 'Zemgale' | 'Vidzeme' | 'Latgale';
  year: 1 | 5 | 15;
  gdp_real_pct: number;
  employment_jobs: number;
  income_tax_eur_m: number;
  social_spending_eur_m: number;
  direction: 'increase' | 'decrease' | 'neutral';
}

export interface InvestmentImpact {
  year: 1 | 5 | 15;
  public_investment_eur_m: number;
  private_investment_eur_m: number;
  fdi_investment_eur_m: number;
  total_investment_eur_m: number;
  direction: 'increase' | 'decrease' | 'neutral';
  explanation: string;
}

export interface ScenarioResult {
  scenario_id: string;
  title: string;
  policy_changes: string[];
  horizon_impacts: HorizonImpact[]; // must include 1, 5, 15
  regional_area_impacts: RegionalAreaImpact[]; // must include all 6 areas for years 1, 5, 15
  investment_impacts: InvestmentImpact[]; // must include 1, 5, 15
  model_name: string;
  model_version: string;
  confidence: 'low' | 'medium' | 'high';
  assumptions: string[];
  caveats: string[];
}

export interface ChatQueryResponse {
  answer_markdown: string;
  scenario: ScenarioResult;
  dashboard_patch: {
    revenue_deltas: Array<{ id: string; delta_eur_m: number }>;
    expenditure_deltas: Array<{ id: string; delta_eur_m: number }>;
    sankey_links: SankeyLink[];
  };
}
```

---

## Section 9: File Structure

```text
/app
  /layout.tsx
  /page.tsx
  /api/

/components
  /chat/
    GlobalAskBar.tsx
    ChatPanel.tsx
    ScenarioImpactCards.tsx
    HorizonImpactTable.tsx
    RegionalImpactHeatmap.tsx
    InvestmentImpactPanel.tsx
  /revenue/
    RevenuePanel.tsx
    RegionTaxRow.tsx
    RevenueRow.tsx
  /expenditure/
    ExpenditurePanel.tsx
    BudgetRow.tsx
    ProjectRow.tsx
  /flow/
    SankeyView.tsx
  /map/
    RegionalMap.tsx
    RegionalDetailPanel.tsx
  /shared/
    Header.tsx

/lib
  store.ts
  api.ts
  types.ts
  model.ts
  utils.ts

/public
  latvia.geojson
```

---

## Section 10: Installation

```bash
npx create-next-app@latest latvia-fiscal-flow --typescript --tailwind --app
cd latvia-fiscal-flow
npm install zustand @tanstack/react-query react-simple-maps
npm install react-sankey-component
npm install @radix-ui/react-tooltip @radix-ui/react-checkbox @radix-ui/react-radio-group
npm install zod
```

Environment:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Add map data:
- Place Latvia regions GeoJSON at `/public/latvia.geojson`

---

## Section 11: MVP and v2

MVP (authoritative from fiscal spec):
- Question-first top layout with global ask bar
- Revenue toggles by region/source
- COFOG expenditure + project list
- Sankey revenue->expenditure flow
- Large interactive Latvia fiscal balance map
- Region detail panel with taxes vs received budget
- Coverage examples (hospital costs vs local taxes)
- Responsive layout + data quality badge
- Global chat input that accepts natural-language policy questions
- Chat orchestrator that uses all APIs/data and returns best-available answer
- Scenario outputs for exactly 1, 5, 15 years:
  - Budget outcomes
  - Economy outcomes
  - Regional area outcomes (increase/decrease by area)
  - Investment outcomes
  - Model name/version, assumptions, confidence

v2 (optional, inherited from older spec where useful):
- Saved scenarios
- Historical trend charts
- CSV/PDF export
- Region comparison mode
- Municipality drill-down

---

## Section 12: Testing

Core scenarios:
1. Revenue toggle updates Sankey and totals correctly.
2. Expenditure edit recalculates deficit/surplus and affected links.
3. Clicking a region opens correct fiscal detail panel values.
4. Map colors match fiscal balance thresholds.
5. API failure states show recoverable error UI.
6. Mobile/tablet layouts keep all core actions accessible.
7. User prompt: "simulate 2nd pension pillar removal" returns:
   - Parsed policy changes
   - Horizon impacts for years 1/5/15
   - Regional area impacts for Riga/Pieriga/Kurzeme/Zemgale/Vidzeme/Latgale
   - Investment impacts for years 1/5/15
   - Updated fiscal flow visuals
   - Model metadata + confidence

Optional v2 scenarios:
1. Save/load scenario reproduces panel state.
2. Export scenario report and assumptions as PDF/CSV.

---

## Section 13: Deployment

```bash
npm run build
```

Deploy on Vercel or equivalent:
- Set `NEXT_PUBLIC_API_URL`
- Validate production GeoJSON loading and map rendering
- Verify CORS and API route proxies

---

## Section 14: Frontend Task Breakdown (Clear, Execution-Ready)

Goal:
- Make government trade-offs visible and understandable.
- Let users ask natural questions and immediately see cross-impacts.
- Maximize transparency: what changed, why it changed, and confidence.

Frontend-only rule:
- Implement all tasks with mocked/stubbed API responses first.
- Do not block UI delivery on backend completion.

Execution order (Lovable-focused):

1. FE-01 Build the question-first shell.
- Deliver sticky ask bar, prompt chips, and responsive page scaffolding.
- Done when user can ask a question without scrolling.

2. FE-02 Build answer-first result blocks.
- Deliver fixed cards for Year 1, Year 5, Year 15 with budget/economy/investment.
- Done when every assistant response renders all three horizons.

3. FE-03 Build "Why this happens" explanation module.
- Deliver key drivers, causal chain, and winners/losers.
- Done when each result has plain-language cause/effect narrative.

4. FE-04 Build evidence visuals linked to answers.
- Deliver Sankey and regional map as synchronized views.
- Done when selecting a chat claim highlights matching flow/map region.

5. FE-05 Build revenue and expenditure detail panels.
- Deliver editable/toggleable panels for fiscal drill-down.
- Done when details can be explored without losing scenario context.

6. FE-06 Build regional impact by area.
- Deliver heatmap/table for all Latvia areas with increase/decrease indicators by horizon.
- Done when Riga, Pieriga, Kurzeme, Zemgale, Vidzeme, and Latgale are shown for 1/5/15 years.

7. FE-07 Build investment impact panel.
- Deliver public/private/FDI and total investment deltas by horizon.
- Done when short-term and long-term investment effects are comparable at a glance.

8. FE-08 Build transparency and trust layer.
- Deliver model metadata, assumptions, caveats, confidence, and data freshness tags.
- Done when uncertainty is always visible in the same viewport as results.

9. FE-09 Build interaction quality states.
- Deliver empty/loading/error/retry states and optimistic UI transitions.
- Done when no state leaves blank or ambiguous output.

10. FE-10 Build accessibility and clarity polish.
- Deliver keyboard support, chart/map labels, and non-technical copy.
- Done when core flows are usable without a mouse and understandable to non-experts.

Non-negotiable usability checks:
- One prompt -> first meaningful answer in under 3 seconds (mocked data path).
- User sees short-term and long-term impacts without opening extra panels.
- Every major number has visible "why" context and confidence marker.
- Regional and investment impacts are always present, not hidden in tabs on desktop.

Acceptance criteria for your transparency goal:
- User asks one question in natural language.
- UI explains:
  - what challenge the government is facing,
  - why this is important,
  - how decision A affects B/C/D,
  - which Latvia areas see increase/decrease and by how much,
  - how investment changes short-term and long-term,
  - and what the model predicts in years 1, 5, 15.
- User can verify assumptions and confidence without leaving the page.

---

## Section 15: Lovable Task (Use This Brief)

Build a modern, question-first fiscal dashboard for Latvia.

Must-have interaction:
- Single global ask input as the primary control.
- Natural-language policy question produces a structured answer with:
  - Year 1, Year 5, Year 15 impacts
  - Budget, macroeconomy, regional areas, and investment changes
  - Causal explanation, assumptions, caveats, confidence
- Evidence views (Sankey + map) must stay synchronized with the answer.

Must-have visual outputs:
- Horizon cards (`1y`, `5y`, `15y`)
- "Why this happens" causal chain
- Sankey revenue->expenditure
- Latvia area impact heatmap/table (increase/decrease by area)
- Investment panel (public/private/FDI/total by horizon)
- Transparency drawer (model version, assumptions, confidence, data freshness)

Design direction:
- Clean, modern, high-contrast UI with clear hierarchy.
- Fast comprehension: answer-first, detail-on-demand.
- Minimal friction on mobile with sticky ask bar and focused tabs.

Definition of done:
- A non-technical user can ask one policy question and understand:
  - what changes,
  - why it changes,
  - which areas win/lose,
  - and short-term vs long-term effects,
  in one continuous screen flow.

---

## Final Notes

- Product scope is a fiscal flow transparency dashboard.
- Conversational scenario simulation is a core entrypoint, but its output must always map back into fiscal-flow visuals (revenue, expenditure, Sankey, map).
- This combined spec is implementation-ready and keeps source precedence explicit.
