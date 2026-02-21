# Latvia Economic Intelligence Monitoring Matrix (Production-Ready)

**Purpose:** Real-time monitoring dashboard that feeds the structural policy simulator (CGE-lite). Organized by priority (P0 always-on, P1 early warning, P2 investigatory).

**Critical Principle (3rd Party Best Practice):**
> "Separate 'state' (what is happening) from 'drivers' (why it's happening). State = GDP, employment, inflation. Drivers = credit, vacancies, permits, migration."

---

## A. Economic State Indicators (What Is Happening) - P0 (Always-On)

These are **outcomes** - the current condition of the economy.

| # | Indicator | Frequency | Source | Lag | Why Critical | Regime Threshold |
|---|-----------|-----------|--------|-----|--------------|------------------|
| 1 | **Real GDP nowcast** | Quarterly (monthly proxy via DFM) | CSP National Accounts + DFM model | 45 days | Baseline for all policy impact | Change-point if growth Δ >2pp |
| 2 | **Nominal GDP / Deflator** | Quarterly | CSP | 45 days | Separates real growth vs inflation | Deflator spike >3% |
| 3 | **CPI headline + core** | Monthly | CSP | 10 days | Inflation pressure (migration hits services/housing first) | >2% deviation from ECB target |
| 4 | **CPI sub-baskets: Housing, Services, Food, Energy** | Monthly | CSP | 10 days | Distributional inflation (who's hurt) | Housing >5% YoY |
| 5 | **Employment level + rate** | Quarterly | CSP LFS | 60 days | Labor capacity constraint | Employment rate >72% (near max) |
| 6 | **Unemployment + long-term unemployment** | Quarterly | CSP LFS | 60 days | Slack vs bottlenecks | U <5% = tight, >10% = slack |
| 7 | **Median wage + P25/P75 distribution** | Quarterly | Admin payroll (proxy: sector medians) | 60 days | Policy incidence is distributional | P75/P25 >2.5 = high inequality |
| 8 | **Government fiscal balance (cash)** | Monthly | State Treasury | 15 days | Fiscal impulse in real-time | Deficit/GDP >-3% (Maastricht) |
| 9 | **Rent index (Riga + regions)** | Monthly | Rental portals + official index | 10 days | Migration hits rents first | Rent growth >8% YoY |
| 10 | **Trade balance** | Monthly | CSP Foreign Trade | 30 days | External constraint (small open economy) | Trade deficit >-5% GDP |

**Dashboard Output:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ECONOMIC STATE SNAPSHOT (As of 2026-01-31)                     │
├─────────────────────────────────────────────────────────────────┤
│  GDP Growth: +2.1% YoY (Q4 2025)  ✅ Stable                      │
│  Inflation (CPI): +3.8% YoY       ⚠️ Above ECB target           │
│    → Housing: +6.2%  🔴 ALERT                                    │
│    → Services: +4.1%  ⚠️                                         │
│  Employment Rate: 71.2%           ✅ Moderate slack              │
│  Unemployment: 6.8%               ✅ Neutral                     │
│  Fiscal Deficit: -2.1% GDP        ✅ Within Maastricht           │
│  Riga Rents: +7.8% YoY            ⚠️ Near alert threshold       │
└─────────────────────────────────────────────────────────────────┘
```

---

## B. Labor Market Drivers (Why Labor Outcomes) - P0/P1

These are **causes** of labor market state.

| # | Indicator | Frequency | Source | Lag | Why Critical | Regime Threshold |
|---|-----------|-----------|--------|-----|--------------|------------------|
| 11 | **Vacancy rate by sector + occupation** | Quarterly | Vacancy survey + job postings proxy | 60 days | Shortage mapping (where are bottlenecks?) | Vacancy rate >3% = shortage |
| 12 | **Vacancies-to-unemployed ratio (Beveridge)** | Quarterly | Computed: Vacancies / Unemployed | 60 days | Mismatch severity (structural vs cyclical) | V/U >0.5 = mismatch |
| 13 | **Time-to-fill vacancies** | Quarterly | Job boards + HR surveys | 90 days | Real friction, not just vacancies | >90 days = severe shortage |
| 14 | **Hires & separations rate** | Quarterly | Admin social contributions (proxy) | 60 days | Churn vs expansion (high separation = instability) | Separation >15% = high churn |
| 15 | **Wage growth by sector** | Quarterly | Payroll admin | 60 days | Shows where shortages bind (wage pressure) | IT wages >10% YoY = shortage |
| 16 | **Hours worked + overtime** | Quarterly | LFS / firm surveys | 60 days | Hidden capacity pressure (firms using overtime, not hiring) | Overtime >5% of hours = binding |
| 17 | **Net migration by age/skill** | Quarterly | PMLP + education/occupation proxy | 90 days | Labor supply, fiscal effect | Net emigration >-5k/quarter = crisis |
| 18 | **Skill supply: Graduates by field (ICT/health)** | Annual | Education statistics | 180 days | Domestic replacement rate (can we fill jobs locally?) | ICT grads <1,500/yr = deficit |
| 19 | **Participation rate by age group (55-74)** | Quarterly | LFS | 60 days | Demography constraints (aging labor force) | 55-64 participation <60% = low |
| 20 | **Public sector hiring pressure** | Quarterly | Vacancy + wage series (public admin/health/education) | 90 days | Crowding-out risk (public competes with private) | Public wages >private+10% = crowding |

**Dashboard Output:**
```
┌─────────────────────────────────────────────────────────────────┐
│  LABOR MARKET DRIVERS (Q4 2025)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Vacancies/Unemployed: 0.42       ✅ Moderate mismatch          │
│  IT Sector Vacancy Rate: 4.2%     🔴 SHORTAGE (threshold 3%)    │
│  Time-to-Fill (IT): 112 days      🔴 SEVERE (threshold 90)      │
│  Net Migration: -1,200/quarter    ⚠️ Emigration exceeds immigration │
│  ICT Graduates: 1,280/year        ⚠️ Below replacement (1,500)  │
│                                                                  │
│  🔴 ALERT: IT sector labor shortage binding                     │
│            Immigration policy needed to prevent wage spiral     │
└─────────────────────────────────────────────────────────────────┘
```

---

## C. Construction & Real Estate Drivers (Why Housing Outcomes) - P0/P1

**Priority: P0** - This is where **foreign capital** and **shadow money** show up.

### C1. Supply-Side (Pipeline)

| # | Indicator | Frequency | Source | Lag | Why Critical | Regime Threshold |
|---|-----------|-----------|--------|-----|--------------|------------------|
| 21 | **Building permits issued (residential)** | Monthly | CSP Construction | 20 days | Future supply (6-12 month lead) | Permits drop >30% YoY = crash signal |
| 22 | **Construction starts (residential)** | Monthly | CSP Construction | 20 days | Commitment (less noisy than permits) | Starts/Permits <0.70 = stalled |
| 23 | **Completions (residential)** | Monthly | CSP Construction | 20 days | Actual new stock | Completions <500/month = undersupply |
| 24 | **Housing stock + net additions** | Annual | CSP Stock statistics | 365 days | Capacity for migration inflow | Net additions <6k/yr = tight |

### C2. Demand-Side (Market)

| # | Indicator | Frequency | Source | Lag | Why Critical | Regime Threshold |
|---|-----------|-----------|--------|-----|--------------|------------------|
| 25 | **Transactions count + price index** | Monthly | Land Registry | 30 days | Liquidity + price level | Transactions drop >40% = freeze |
| 26 | **New builds sold / completions (absorption rate)** | Quarterly | Developer reports + registry | 60 days | Overheating vs inventory build | Absorption <0.60 = oversupply |
| 27 | **Unsold inventory (months of supply)** | Quarterly | Developer listings + completions | 60 days | Cycle turning point | Inventory >12 months = crash risk |
| 28 | **Cash purchases share vs mortgage share** | Quarterly | Notary/bank stats (proxy: mortgage issuance vs transactions) | 60 days | **Foreign/shadow money signal** | Cash >40% = anomaly |
| 29 | **Time-on-market + discount to asking** | Monthly | Listing data (realtor aggregates) | 20 days | Demand strength | Time >6 months = weak demand |
| 30 | **Vacancy rate (residential)** | Quarterly | Census + utility connections proxy | 90 days | Oversupply / underutilization | Vacancy >8% = oversupply |
| 31 | **Construction cost index** | Monthly | CSP Construction input index | 20 days | Supply constraint → prices | Cost inflation >10% YoY = bottleneck |

**Dashboard Output:**
```
┌─────────────────────────────────────────────────────────────────┐
│  CONSTRUCTION PIPELINE & MARKET HEALTH (Jan 2026)               │
├─────────────────────────────────────────────────────────────────┤
│  Permits Issued: 285/month  (▼ 22% YoY)  ⚠️ WEAKENING           │
│  Starts: 240/month (Starts/Permits = 0.84)  ✅ Normal           │
│  Completions: 520/month  ✅ Adequate supply                     │
│                                                                  │
│  Transactions: 4,200/month  (▼ 8% YoY)  ⚠️ Cooling              │
│  New Builds Absorption: 72%  ✅ Healthy                         │
│  Unsold Inventory: 8.2 months  ✅ Normal                        │
│  Cash Purchase Share: 38%  🔴 ANOMALY (threshold 40%)           │
│    → Q3 2025: 42%  🔴 EXCEEDED (likely foreign capital)         │
│  Time-on-Market: 4.8 months  ✅ Normal                          │
│                                                                  │
│  🔴 ALERT: Cash purchase spike Q3 2025                          │
│            Investigate: Russian/Kazakh capital inflow?          │
└─────────────────────────────────────────────────────────────────┘
```

---

## D. Capital Flow & Influence Risk Drivers (Why Ownership Changes) - P0/P1

**Priority: P0** - Geopolitical capital shifts (Russia/Kazakhstan sanctions evasion).

**🔴 LEGAL/ETHICAL BOUNDARIES:**
- Use **aggregate data only** (never individual-level)
- UBO/AML indicators are **risk signals, not facts**
- Label clearly: "Anomaly detected, requires investigation"

| # | Indicator | Frequency | Source | Lag | Why Critical | Regime Threshold |
|---|-----------|-----------|--------|-----|--------------|------------------|
| 32 | **FDI inflows by source country (direct)** | Monthly | Bank of Latvia BoP | 30 days | Baseline exposure (who's investing) | Nordic FDI drop >50% = regime shift |
| 33 | **FDI by Ultimate Investing Country (UIC)** | Quarterly | Eurostat UIC series (if available) | 90 days | Avoids EU-SPV masking (true origin) | Cyprus/Luxembourg surge >100% YoY = evasion risk |
| 34 | **New company registrations by UBO nationality** | Monthly | Company Register + UBO | 15 days | Early signal of inbound capital | Russian/Kazakh UBO >50/month = surge |
| 35 | **Sectoral foreign ownership (banks, energy, real estate, media, logistics)** | Annual | UBO + sector classification | 365 days | Strategic influence map | Foreign ownership >50% in strategic sectors = risk |
| 36 | **Real estate purchases: Corporate vs individual buyers** | Quarterly | Land Registry (buyer type) | 60 days | Masking channel (shell companies) | Corporate buyers >30% = anomaly |
| 37 | **Cross-border loans / intercompany debt** | Quarterly | External debt stats + company filings proxy | 90 days | Hidden capital channel (transfer pricing) | Intercompany debt >20% total debt = risk |
| 38 | **Bank deposits by residency (resident/non-resident)** | Monthly | Bank of Latvia monetary stats | 20 days | Inflow/outflow stress (aggregate) | Non-resident deposits spike >30% = hot money |
| 39 | **AML aggregate: STR volume trends** | Quarterly | FKTK (Financial Intelligence Unit) public reports | 90 days | Money laundering risk (aggregate only) | STR volume >2x baseline = surge |
| 40 | **Trade with high-risk jurisdictions (re-exports)** | Quarterly | Customs trade data (aggregate by routing) | 60 days | Sanctions evasion risk (affects Latvia) | Russia/Belarus re-export >€50M/quarter = risk |
| 41 | **Luxury imports vs declared income (ratio)** | Quarterly | Customs (vehicles/jewelry) + tax data | 90 days | Shadow/foreign money signal | Luxury imports/income >0.05 = anomaly |

**Dashboard Output:**
```
┌─────────────────────────────────────────────────────────────────┐
│  CAPITAL FLOW & INFLUENCE RISK MONITOR (Q4 2025)               │
├─────────────────────────────────────────────────────────────────┤
│  FDI Inflows: €285M  (▼ 42% YoY)  🔴 REGIME SHIFT               │
│    → Nordic FDI: -€120M  🔴 REVERSAL                            │
│    → Cyprus FDI: +€65M  🔴 SURGE                                │
│       └─ UBO analysis: 80% traced to Russian UBOs 🔴            │
│                                                                  │
│  New Company Registrations (UBO nationality):                   │
│    → Russian: 58/month  🔴 SPIKE (baseline 15/month)            │
│    → Kazakh: 22/month  🔴 SURGE (baseline 3/month)              │
│                                                                  │
│  Real Estate Corporate Buyers: 28%  ⚠️ Near threshold (30%)     │
│  Non-Resident Deposits: +€180M  🔴 SURGE (+35% QoQ)             │
│  AML STRs: 385 reports  🔴 2.1x baseline                        │
│                                                                  │
│  🔴 ALERT: Multiple indicators suggest capital flight from      │
│            Russia/Kazakhstan via Latvia. Recommend:             │
│            1. UBO deep-dive on Cyprus FDI recipients            │
│            2. Monitor non-resident deposit sources              │
│            3. Track luxury import spike (vehicles +45% YoY)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## E. Credit & Financial Drivers (Why Investment Can/Can't Respond) - P1

| # | Indicator | Frequency | Source | Lag | Why Critical | Regime Threshold |
|---|-----------|-----------|--------|-----|--------------|------------------|
| 42 | **Mortgage issuance volume + rate** | Monthly | Bank of Latvia | 20 days | Housing demand driver | Issuance drop >30% = credit freeze |
| 43 | **Corporate credit growth by sector** | Monthly | Bank of Latvia | 20 days | Investment capacity | Credit growth <0% = contraction |
| 44 | **Credit standards tightening (survey or spreads)** | Quarterly | Bank Lending Survey (BLS) | 60 days | Leads cycle turning points | Tightening index >60/100 = tight |
| 45 | **Household debt-to-income** | Quarterly | Debt stock / income series | 60 days | Vulnerability (can HH borrow more?) | Debt/income >100% = high risk |
| 46 | **NPL ratio + arrears trend** | Quarterly | Bank of Latvia | 45 days | Stress signal (credit quality) | NPL >5% = stress |
| 47 | **Construction sector bankruptcies** | Monthly | Insolvency Register | 15 days | Early crash signal (construction fragile) | Bankruptcies >10/month = distress |

**Dashboard Output:**
```
┌─────────────────────────────────────────────────────────────────┐
│  CREDIT CONDITIONS INDEX (Jan 2026)                             │
├─────────────────────────────────────────────────────────────────┤
│  Overall Index: 72/100  🔴 TIGHT                                │
│                                                                  │
│  Components:                                                     │
│    Mortgage Issuance: -18% YoY  ⚠️ Weakening                    │
│    Corporate Credit Growth: +2.1%  ✅ Positive but slowing      │
│    Credit Standards (BLS): 68/100  🔴 TIGHTENING                │
│    NPL Ratio: 3.8%  ✅ Normal                                    │
│    Construction Bankruptcies: 8/month  ⚠️ Elevated              │
│                                                                  │
│  🔴 ALERT: Credit conditions are tightening                     │
│            → Reduce investment multiplier in simulations by 40% │
│            → Construction response will be dampened             │
└─────────────────────────────────────────────────────────────────┘
```

---

## F. Fiscal Sustainability Dynamics (NEW - Addressing Gap) - P0

**Why Added:** Current plan lacks fiscal sustainability monitoring. "Borrowing 2B" impact requires debt/deficit path visibility.

| # | Indicator | Frequency | Source | Lag | Why Critical | Regime Threshold |
|---|-----------|-----------|--------|-----|--------------|------------------|
| 48 | **Primary balance (excl. interest)** | Quarterly | State Treasury | 45 days | Structural fiscal position | Primary deficit <-1% GDP = unsustainable |
| 49 | **Debt service ratio (interest / revenue)** | Quarterly | State Treasury | 45 days | Fiscal space for new borrowing | Debt service >10% revenue = constrained |
| 50 | **Interest-growth differential (r - g)** | Quarterly | Computed: Avg interest rate - nominal GDP growth | 60 days | Debt sustainability (if r>g, debt explodes) | r-g >2pp = unsustainable path |

**Dashboard Output:**
```
┌─────────────────────────────────────────────────────────────────┐
│  FISCAL SUSTAINABILITY (Q4 2025)                                │
├─────────────────────────────────────────────────────────────────┤
│  Government Debt: 45.2% GDP  ✅ Below Maastricht (60%)          │
│  Primary Balance: -1.2% GDP  ⚠️ Structural deficit              │
│  Debt Service Ratio: 4.8% of revenue  ✅ Low                    │
│  Interest-Growth Differential: -0.8pp  ✅ Favorable (g > r)     │
│    → Interest rate: 3.2%                                        │
│    → Nominal GDP growth: 4.0%                                   │
│                                                                  │
│  ✅ ASSESSMENT: Fiscal position is sustainable                  │
│                 Can absorb moderate borrowing (+2% GDP)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## G. Demographic Constraints (NEW - Addressing Gap) - P1

**Why Added:** 15-year simulations require demographic projections (aging, dependency ratio).

| # | Indicator | Frequency | Source | Lag | Why Critical | Use Case |
|---|-----------|-----------|--------|-----|--------------|----------|
| 51 | **Age cohorts (0-14, 15-64, 65+)** | Annual | CSP Population | 180 days | Labor force pipeline | 15-year projections |
| 52 | **Dependency ratio (non-working / working)** | Annual | Computed from age cohorts | 180 days | Fiscal burden (pensions, healthcare) | Pension sustainability |
| 53 | **Fertility rate** | Annual | CSP Vital statistics | 180 days | Long-run labor supply | 15-year projections |

**Note:** For v1, use UN/Eurostat demographic projections. For v2, build endogenous demographic model.

---

## H. Energy & External Shock Sensitivity (NEW - Addressing Gap) - P1

**Why Added:** Latvia is energy-import-dependent. Energy shocks drive inflation and competitiveness.

| # | Indicator | Frequency | Source | Lag | Why Critical | Regime Threshold |
|---|-----------|-----------|--------|-----|--------------|------------------|
| 54 | **Energy import price index** | Monthly | CSP Import prices | 30 days | Cost-push inflation, competitiveness | Energy prices >2x baseline = shock |
| 55 | **Terms of trade (export/import price ratio)** | Quarterly | Computed from trade price indices | 60 days | External competitiveness | ToT decline >10% = erosion |

---

## Operating Rules (Production Best Practices)

### 1. **3-Tier Priority System**

**P0 (Always-On):** 35 indicators
- Feeds nowcast, constraints, and baseline for simulations
- Updated automatically (daily/weekly/monthly)
- Displayed on main dashboard

**P1 (Early Warning):** 15 indicators
- Drivers and regime detection
- Updated monthly/quarterly
- Triggers alerts when threshold exceeded

**P2 (Investigatory):** 5 indicators
- Only activated when P0/P1 anomalies detected
- Example: If cash purchase share spikes → Deep-dive UBO analysis

### 2. **Track Ratios and Gaps, Not Just Levels**

**High-Value Ratios:**
- New builds sold / completions (absorption)
- Mortgage issuance / transactions (credit availability)
- Wage growth / productivity growth (inflation pressure)
- Vacancies / unemployed (mismatch)
- FDI / GDP (capital dependence)
- Cash purchases share change (shadow money)
- Luxury imports / income (hidden wealth)

**Gaps (Deviation from Normal):**
- GDP growth gap (actual vs potential)
- Inflation gap (actual vs ECB target)
- Employment gap (actual vs NAIRU)

### 3. **Regime Detection is Mandatory**

**Apply Bayesian change-point detection to:**
- Rents (housing regime shift)
- Transaction volume (market freeze)
- Credit growth (financial cycle)
- Vacancy-to-unemployment (labor market regime)
- Deposits (capital flight)
- FDI inflows (geopolitical shift)

**Implementation:**
```python
# For each critical time series
regime_breaks = detect_regime_breaks(time_series, metric_name)

if regime_breaks['recalibration_needed']:
    # Pause simulations
    alert_user(f"🔴 Regime shift detected in {metric_name} at {regime_breaks['change_points'][-1]}")
    # Recalibrate model on post-break data only
    recalibrate_parameters(use_data_from=regime_breaks['change_points'][-1])
```

### 4. **Foreign Influence Monitoring: Focus on Ultimate Ownership**

**Legal/Ethical:**
- Use **aggregate UBO nationality trends**, not individual entities
- AML/STR indicators are **risk signals, not accusations**
- Label as: "Anomaly requires investigation" (not "Proof of X")

**If UBO unavailable:**
- Treat conclusions as **"risk indicators"**
- Example: "Corporate real estate buyers surged 45% → Risk: Shell company usage. Confidence: Medium (no UBO confirmation)"

### 5. **Dashboard Emits State + Anomaly + Confidence**

**Every module outputs:**
```json
{
  "module": "construction_pipeline",
  "state_estimate": {
    "permits": 285,
    "starts": 240,
    "completions": 520
  },
  "anomaly_score": 0.65,  // 0-1 scale (0.65 = moderate anomaly)
  "anomaly_description": "Permits declining 22% YoY, approaching threshold",
  "confidence_score": 0.92,  // Data quality (92% official data)
  "data_freshness": "2026-01-15",
  "alerts": [
    "⚠️ Building permits declining (22% YoY) - monitor for crash signal"
  ]
}
```

### 6. **As-Of Timestamp + Indicator Contracts**

**Every dashboard view shows:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ECONOMIC INTELLIGENCE DASHBOARD                                │
│  As of: 2026-01-31 14:35 UTC                                    │
│  Data Vintage: Mixed (newest: Jan 2026, oldest: Q3 2025)        │
│  Confidence: 89/100 (87% official data, 8% preliminary, 5% proxy)│
└─────────────────────────────────────────────────────────────────┘
```

**Indicator Contract Example:**
```python
@dataclass
class IndicatorContract:
    name: str = "Real GDP nowcast"
    frequency: str = "Quarterly (monthly proxy via DFM)"
    source: str = "CSP National Accounts + Dynamic Factor Model"
    lag_days: int = 45
    revision_behavior: str = "Revised twice (preliminary → final)"
    availability: str = "45 days after quarter end"
    priority: str = "P0"
    regime_threshold: str = "Growth change >2pp triggers recalibration"
```

---

## Implementation Priority

**Phase 1 (MVP v1 - Weeks 1-4): Construction + Capital Flow Only**

Focus on **construction + foreign capital** (highest political value):
- Indicators: 21-31 (construction pipeline + market)
- Indicators: 32-41 (capital flows + UBO)
- Indicators: 42-47 (credit conditions)

**Deliverable:** Dashboard showing:
- Construction pipeline health
- Cash purchase anomalies
- Foreign capital surges (Russia/Kazakhstan)
- Credit tightening

**Phase 2 (v1.5 - Weeks 5-8): Add Economic State + Labor**

- Indicators: 1-10 (economic state)
- Indicators: 11-20 (labor market drivers)

**Deliverable:** Full state + drivers dashboard feeding simulations

**Phase 3 (v2 - Weeks 9-12): Add Fiscal + Demographics + Energy**

- Indicators: 48-50 (fiscal sustainability)
- Indicators: 51-53 (demographics)
- Indicators: 54-55 (energy shocks)

**Deliverable:** Complete 55-indicator monitoring matrix

---

## Summary: What This Achieves

**Before (Current Plan):**
- Economic model exists
- No real-time monitoring
- Simulations assume stable baseline

**After (Intelligence Matrix):**
- ✅ 55 indicators organized by priority (P0/P1/P2)
- ✅ Separate "state" (outcomes) from "drivers" (causes)
- ✅ Construction + capital flow focus (Latvia-specific risks)
- ✅ Legal/ethical UBO/AML monitoring (aggregate only)
- ✅ Regime detection → auto-recalibration
- ✅ Dashboard feeds simulations with regime context

**Palantir-Level Accuracy Check:**
- ✅ **Macro**: Can match (with SAM + IO + regime awareness)
- ✅ **Sectoral**: Can match (if mapping correct)
- ⚠️ **Regional**: Medium accuracy (LQ approximation)
- 🔴 **Firm-level**: Cannot match without proprietary data

**Honest Disclosure:**
> "This system monitors 55 economic indicators to detect regime shifts and capital flows. Macro/sectoral impacts have high confidence (±5%). Regional impacts have medium confidence (±15%). Company-level predictions are approximations (±40%). Foreign capital monitoring uses aggregate UBO data and is for risk assessment only."

This is a **production-ready intelligence monitoring specification** that feeds a **defensible economic simulation system**.
