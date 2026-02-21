# Connections: APIs, Data Sources, and Central Data

This file defines the API surface, required data sources, and how each connection feeds the central data store. It also lists key factors to account for when wiring these connections.

## API Surface (All Meaningful Endpoints for This Scenario)

### Core Policy Simulation
1. `POST /simulate`
Purpose: Accept a natural-language policy and create a simulation run.
Input: `{ "policy": "...", "country": "LV", "horizon_quarters": 20 }`
Output: `{ "run_id": "..." }`

2. `GET /results/{run_id}`
Purpose: Fetch completed run outputs (GDP, employment, narrative).
Output: `{ "gdp": {...}, "employment": {...}, "narrative": "..." }`

3. `GET /status/{run_id}`
Purpose: Track run state for long or queued simulations.
Output: `{ "status": "pending|running|done|error", "progress": 0.42 }`

4. `POST /policy/parse`
Purpose: Return the policy interpretation without running the simulation.
Input: `{ "policy": "...", "country": "LV" }`
Output: `{ "parameter_changes": {...}, "confidence": 0.86 }`

5. `POST /scenario/generate`
Purpose: Produce low/base/high scenarios from a parsed policy.
Input: `{ "parameter_changes": {...} }`
Output: `{ "scenarios": [{...}, {...}, {...}] }`

### Data Access
6. `GET /data/latest`
Purpose: Return the latest time-series snapshot used by simulations.
Output: `{ "as_of": "YYYY-QX", "series": {...} }`

7. `GET /data/series`
Purpose: Query normalized time-series for a metric.
Input: `metric`, `country`, `from`, `to`
Output: `{ "metric": "...", "values": [...] }`

8. `GET /sources`
Purpose: Data provenance and last-updated timestamps.
Output: `{ "sources": [{ "name": "...", "last_updated": "..." }] }`

### Model Configuration
9. `GET /parameters`
Purpose: Expose current elasticities and model constants.
Output: `{ "parameters": {...} }`

10. `PUT /parameters`
Purpose: Admin update of parameters (for manual calibration in MVP).
Input: `{ "parameters": {...} }`
Output: `{ "ok": true }`

11. `GET /model/version`
Purpose: Report model version and prompt version for reproducibility.
Output: `{ "model_version": "...", "prompt_version": "..." }`

### Ingestion and Ops (Admin)
12. `POST /ingest/refresh`
Purpose: Trigger a data refresh (manual or scheduled).
Output: `{ "job_id": "..." }`

13. `GET /ingest/status/{job_id}`
Purpose: Monitor ingestion job progress.
Output: `{ "status": "pending|running|done|error" }`

14. `GET /ingest/logs`
Purpose: Recent ingestion outcomes and anomalies.
Output: `{ "logs": [...] }`

15. `GET /health`
Purpose: Liveness check.
Output: `{ "status": "ok" }`

16. `GET /ready`
Purpose: Readiness check (DB + data freshness OK).
Output: `{ "ready": true, "checks": {...} }`

## Data Sources To Use (Latvia v1)

Primary (use first)
1. CSP PxWeb (Latvia) for employment, wages, GDP/GVA, unemployment, CPI.

Secondary (use as fallback or cross-check)
2. Eurostat SDMX for CPI and production indices.

Manual file ingestion (MVP)
3. PMLP for immigration stocks (annual, manual download).

## Expanded Economy Data APIs (Meaningful Sources)

### Central Banks (Monetary, Rates, FX, Reserves)
1. Bank of Latvia data for policy rates, money aggregates, FX, credit.
2. European Central Bank SDW for euro-area rates, yield curves, FX, monetary aggregates.
3. Federal Reserve (FRED) for global benchmarks, rates, yields, inflation, labor.
4. Bank for International Settlements for cross-border banking and credit series.

### National Statistical Offices (Country-Level Macro)
1. Latvia CSP PxWeb (primary for Latvia).
2. Lithuania Statistics (Statistics Lithuania).
3. Estonia Statistics (Statistics Estonia).
4. Poland Statistics (Statistics Poland).
5. Any additional national statistics office for target expansion countries.

### Multilateral and Global Datasets
1. Eurostat SDMX for EU-wide harmonized series.
2. IMF (IFS, WEO, DOTS) for macro, forecasts, trade statistics.
3. World Bank WDI for long-run macro series.
4. OECD for productivity, labor market, and structural indicators.
5. UN Comtrade for trade flows by product and partner.
6. ILOSTAT for labor market and wage indicators.
7. UN DESA for population and demographic structures.

### Labor and Migration
1. National migration agency (PMLP for Latvia).
2. Eurostat migration and asylum datasets.
3. EURES or national job vacancy datasets (if available).

### Fiscal and Government Finance
1. Ministry of Finance / State Treasury for tax revenue and fiscal balance.
2. Eurostat government finance statistics (ESA 2010).
3. Latvia Open Data Portal budget datasets (state budget, budget estimates).
4. State Treasury consolidated budget execution (monthly reports + annex tables).
5. CSB PxWeb government finance tables (API access for fiscal series).
6. IMF QGFS / GFS for standardized fiscal series.

## Additional Data Sources To Consider (v1.5+)

1. Financial market feeds for yield curves and credit spreads.
2. Alternative data (job postings, firm surveys) for labor demand signals.
3. Satellite indicators (electricity usage, freight) for nowcasting.
4. Sector classifications and mappings (NACE alignment tables).

## Central Data Connections

Central data store: PostgreSQL (single DB for MVP).

Minimum tables (logical)
1. `raw_series`
Purpose: Store source values as ingested with minimal transformation.

2. `economic_series`
Purpose: Normalized time-series values used by the model.
Fields: `metric`, `value`, `timestamp`, `country`, `source`

3. `parameters`
Purpose: Model constants and elasticities.
Fields: `key`, `value`, `updated_at`

4. `simulation_runs`
Purpose: Inputs and outputs for auditing and reproducibility.
Fields: `run_id`, `policy_text`, `inputs_json`, `outputs_json`, `created_at`

5. `ingestion_logs`
Purpose: Track load outcomes and data quality checks.

## Connection Flow

1. Ingestion
CSP PxWeb → `raw_series` → normalization → `economic_series`
Eurostat → `raw_series` → normalization → `economic_series`
PMLP file → `raw_series` → normalization → `economic_series` or `immigration_series`

2. Simulation
`parameters` + latest `economic_series` → model → `simulation_runs`

3. API
`/simulate` reads `parameters` + latest `economic_series`
`/simulate` writes `simulation_runs`
`/results/{run_id}` reads `simulation_runs`

## Separate Data Layer: Public Sector Employment and Remuneration

Purpose: build a defensible view of public sector headcount and management pay, including institution-level disclosures.

### A. Public Sector Employment by Category (Primary)
1. Valsts pārvaldes iestāžu amatu un nodarbināto statistika (Valsts kanceleja).
   - Institution-level counts for positions and employed persons.
2. Valsts tiešās pārvaldes iestāžu amatu sadalījums pēc Amatu kataloga klasifikācijas.
   - Job family, level, and salary group classification by institution.

### B. Published Remuneration (Institution Websites)
1. Monthly publication of officials’ remuneration on institution websites (legal requirement from 2025).
   - Parse “amatpersonu atalgojums” pages and PDFs.
2. Example sources to anchor the scraper:
   - Valsts kontrole “Amatpersonu atalgojums” page.
   - University “amatpersonu atalgojums” PDFs/pages (e.g., LU, LKA).

### C. State-Owned and Municipal Capital Companies (Registry + Remuneration)
1. Maintain a master registry of state/municipal capital companies.
   - Seed from State Chancellery oversight lists when available.
   - Augment with municipal “kapitālsabiedrību saraksts” pages (municipality sites).
2. Scrape company “public information” sections and annual reports:
   - Board/supervisory remuneration disclosures.
   - Compensation policies (if published).
3. Use Possessor portfolio list as a verified subset (includes Tet, LMT).

### D. Storage (Recommended Tables)
1. `public_employment` (institution, category, headcount, date, source).
2. `public_positions` (institution, job_family, level, salary_group, FTE).
3. `public_remuneration` (institution, person, role, gross_pay, period, source_url).
4. `public_entity_registry` (entity_name, entity_type, ownership, source_url).

## Separate Data Layer: Central Budget Systems (Latvia)

Purpose: identify the core state systems that collect and manage budget planning, execution, and reporting data.

### A. Unified State Budget Planning and Execution Information System
1. Valsts kases e‑pakalpojums **Budžets**:
   - iestāžu līmeņa plānošana un izpildes kontrole (tāmes),
   - iepirkumu plānošana VPC ietvaros,
   - vidēja termiņa budžeta plānošanas funkcionalitāte.
2. Related Treasury systems:
   - **Maksājumi** (e‑pakalpojums maksājumu rīkojumu iesniegšanai un izpildei),
   - **Iestāžu pārskati** (budžeta/finanšu pārskatu iesniegšana un apmaiņa),
   - **Finansēšanas plāni** (finansēšanas plānu modulis).

### B. Centralized State Financial Resource Planning Platform (New Program)
1. Centralized platform for accounting, HR, budget planning and financial management for central government.
2. Project target: a unified, centralized platform by 2026 (Q2) with process standardization and onboarding of ministries.

### C. Public Open Data Derived from Treasury Systems
1. Monthly consolidated budget execution reports and detailed tables.
2. Detailed institution/program/subprogram execution tables.
3. State debt and guarantees tables.

## Separate Data Layer: Top 100 SOE + University Registry

Purpose: maintain a canonical list of state-owned enterprises (SOEs) and higher-education institutions used across all policy analyses.

### A. Top 100 State-Owned Enterprises (SOE) – Derived Dataset

Approach:
1. Build the full SOE registry from public-owner datasets and ownership disclosures.
2. Rank SOEs by size (primary: turnover; secondary: total assets; tertiary: enterprise value).
3. Publish a stable annual “Top 100 SOE” list with `as_of` date and ranking metric.

Status:
1. A complete public SOE registry export is not yet embedded in this file.
2. To produce the Top 100 list, use UR or Lursoft data (turnover/assets) and rank annually.

Primary sources to generate the list:
1. UR Open Data: Publisko personu un iestāžu saraksts (public institutions registry).
   - Use as the authoritative list of public owners to link ownership chains.
2. UR Commercial Register (or Lursoft API) for company ownership + financials.
   - Required to identify companies where the state is the controlling owner.
3. Top101.lv (state sector filter) as a secondary validation source for large SOEs.

Primary ranking reference (enterprise value):
- Top101.lv company valuation list with filters for “Valsts” sector.

Ownership/legal reference:
- Public Entity Capital Shares and Capital Companies Governance Law (definitions and scope).

### B. Universities and Colleges Registry (Master List)

Primary sources:
1. VIIS is the official register of education institutions and their programs.
2. NIID is a public database of education opportunities and institutions.
3. Use UR “Publisko personu un iestāžu saraksts” to validate public universities.

Note:
The full list is generated from VIIS/NIID exports and reconciled against UR PPI.

### C. Storage (Recommended Tables)
1. `soe_registry` (entity_name, ownership, sector, controlling_ministry, source_url).
2. `soe_rankings` (entity_name, rank, metric, metric_value, as_of_date).
3. `university_registry` (institution_name, type, accreditation_status, source_url).

## Separate Data Layer: Company Registry and Change Monitoring ("Saraksts" Principle)

Purpose: maintain a master list of companies and track changes over time (ownership, management, status, financials).

### A. Official Registers (Primary)
1. Register of Enterprises (UR) API services (requires application and approval).
2. UR “Publisko personu un iestāžu saraksts” for public institutions.

### B. Commercial Data Providers (Secondary / Paid)
1. Lursoft IT API for company information, officials, beneficiaries, and financials.
2. Lursoft company database and annual reports registry.

### C. Change Monitoring
1. UR change notification service (registered and filed changes notifier).
2. Lursoft monitoring service (hourly change notifications).

### D. Storage (Recommended Tables)
1. `company_registry` (reg_no, name, status, legal_form, nace, address, source_url).
2. `company_officers` (reg_no, person_id, role, start_date, end_date).
3. `company_owners` (reg_no, owner_id, stake, start_date, end_date).
4. `company_financials` (reg_no, year, turnover, profit, assets, employees).
5. `company_changes` (reg_no, change_type, change_date, source_url).

## Reference Models (Latvijas Banka)

Purpose: align methodology and expectations with the national central bank’s published model toolkit.

1. Latvijas Banka “Models” overview page (STIP inflation model, CGE with fiscal block, EUROMOD linkage, GDP nowcasting suite, LATIN indicator, DSGE model for Latvia).
2. DSGE model for Latvia description (small open economy, New‑Keynesian framework).
3. CGE model with fiscal sector and CGE‑EUROMOD linkage papers (policy distributional impacts).
## Evaluation: 4-Layer Single-Economy Stack (Recommended Mental Model)

The text you provided is directionally correct. A strong “single-economy” system is not one model; it is a layered stack. The critical implication for engineering is that each layer needs its own data inputs, refresh cadence, and audit trail, but all layers must share a canonical schema so outputs can be composed.

Recommended interpretation for this project:
1. Economic State Engine (truth + nowcast) is required for baseline accuracy.
2. Structural Policy Simulator is the counterfactual engine.
3. Micro/Fiscal Engine is needed for distributional and budget impacts.
4. Behavioral/Flow Modules convert policy into actual economic flows.

Key constraint to accept:
If the stack is not auditable, it will fail. Each layer must log its inputs, assumptions, and “as-of” data vintages.

## Data APIs By Layer (Meaningful, Economy-Focused)

### Layer 1: Economic State Engine (Truth + Nowcast)
1. National statistics office APIs for GDP, sector output, employment, wages, CPI.
2. Central bank data APIs for rates, monetary aggregates, credit, FX.
3. Eurostat SDMX for harmonized EU series and cross-checks.
4. IMF (IFS/WEO) for macro history and cross-country benchmarks.
5. High-frequency activity proxies if available for the country:
   - Electricity demand or grid usage statistics.
   - Transport/freight or port activity datasets.
   - Retail payments or card spending aggregates from central banks.
6. Real-time labor indicators:
   - Job vacancy statistics.
   - Registered unemployment or benefit claims.

### Layer 2: Structural Policy Simulator (Counterfactuals)
1. National accounts and sectoral output datasets (GVA by sector).
2. Input-output tables (national IO or Eurostat supply-use tables).
3. Labor force survey / employment by sector and skill.
4. Wage distributions by sector/occupation.
5. Capital stock and investment series (where available).

### Layer 3: Micro/Fiscal Engine (Distribution + Budget)
1. Tax and benefit rules (Ministry of Finance, State Revenue Service).
2. Household survey microdata (income, labor status, household composition).
3. Administrative data aggregates (tax receipts, benefit payouts).
4. Public spending by function (COFOG classifications).

### Layer 4: Behavioral/Flow Modules (Policy → Reality)
1. Migration agency data: permits, arrivals, categories, processing times.
2. Vacancy and matching data: vacancy rates, time-to-fill, sector mismatch.
3. Sector-specific constraints: housing stock, rents, construction activity.
4. Firm/industry indicators: productivity proxies, output constraints.

## Canonical Data Model (Required for Layer Integration)

Everything should map into:
1. Entity: country, region, sector, occupation, skill group.
2. Metric: employment, wages, vacancies, output, CPI component, permits.
3. Observation: timestamp, value, unit, source, revision-vintage, confidence.
4. Policy Parameters: thresholds, quotas, processing time distribution, eligibility rules.

## Factors To Account For

1. Source reliability and stability (primary vs fallback behavior).
2. Data frequency mismatch (monthly vs quarterly alignment).
3. Unit consistency (EUR vs EUR millions, index base years).
4. Seasonal adjustment flags and revisions.
5. Revisions and backfills (data changes after initial release).
6. Classification changes (NACE/ISCO revisions).
7. Staleness thresholds and alerting.
8. Missing data strategy (impute, carry-forward, or skip).
9. Outlier handling and anomaly detection rules.
10. Determinism and reproducibility (same input, same output).
11. Policy-to-parameter mapping coverage and ambiguity handling.
12. Auditability and provenance for every simulation run.
13. Rate limits, authentication, and API quotas for external sources.
14. Legal/licensing constraints for data usage and redistribution.
15. Performance constraints (ingestion time, simulation latency).
