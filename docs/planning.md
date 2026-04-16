# `dsge_latvia` Recovery Plan

## Purpose

This document is the execution plan for recovering the `dsge_latvia` model into a reproducible, paper-traceable, solvable DSGE implementation. It is intentionally narrower than the product-wide plan in [PLAN.md](/Users/kuznecov/dev/www/economy/docs/PLAN.md:1) and should be read as the working plan for the model-recovery effort.

Use this document as the bridge between:

- the broader system direction in [ARCHITECTURE_PRISM.md](/Users/kuznecov/dev/www/economy/docs/ARCHITECTURE_PRISM.md:1)
- the current `dsge_latvia` code and diagnostics
- the concrete steps required to make the model trustworthy and solvable

The target is structural recovery first. Estimation and later research extensions remain explicitly deferred until the model core solves cleanly.

## Source Provenance

Authoritative sources for the model are:

- 2020 Latvijas Banka Working Paper 5/2020, *Fiscal DSGE model for Latvia*
- 2023 *Baltic Journal of Economics* article, *Fiscal DSGE model for Latvia*
- local appendix transcriptions, raw extracts, and variable-mapping artifacts under `dsge_latvia/docs/`

Source priority:

- Primary source for equations, parameter references, foreign block, and measurement equations: the 2020 working paper and its appendices
- Secondary source for narrative consistency checks and interpretation: the 2023 journal article
- Local transcriptions and mappings are implementation aids, not independent sources of truth

Relevant repo locations:

- `dsge_latvia/model/spec.yaml`
- `dsge_latvia/model/parameters_*.yaml`
- `dsge_latvia/docs/sources.md`
- `dsge_latvia/docs/appendix_a_transcription.md`
- `dsge_latvia/docs/measurement_equations_summary.md`
- `dsge_latvia/docs/equation_trace.md`
- `dsge_latvia/docs/variable_map.yaml`

Known provenance risk:

- parts of the current model use `Temporary closure` equations and implied or placeholder parameters
- these must be treated as audit items, not as settled model structure

## Model Blocks to Verify Against the 2020 Paper

The recovery effort should verify that the implemented structure actually matches the paper-level model composition. At minimum, the following blocks should be checked explicitly against the 2020 working paper and its appendices:

- households: optimizing versus hand-to-mouth or rule-of-thumb households
- firms: intermediate and final goods structure, including price stickiness where applicable
- labor market: search, matching, vacancy filling, and wage bargaining
- fiscal authority: taxes, transfers, spending, debt dynamics, and fiscal rules
- small open economy and foreign block: imports, exports, foreign demand, and terms-of-trade related structure
- euro-area monetary environment: external rate setting and Latvia-specific transmission assumptions

This block verification is part of structural recovery, not optional model enhancement. If the implemented block structure deviates from the paper, the deviation should be documented explicitly before calibration or estimation work begins.

## Current Failure Summary

The current repo state indicates several layered problems.

1. Environment and bootstrap are incomplete.
- The model scripts do not currently run in a clean environment without missing Python dependencies.
- The package/bootstrap workflow is not yet the kind of single documented path another engineer can trust.

2. The steady state is only partially validated.
- The steady-state contract reports low residuals, but static consistency is not fully settled because the resource wedge is exempted rather than eliminated or fully justified.

3. The dynamic system is ill-conditioned and non-determinate.
- The assembled linear system currently fails determinacy.
- Existing diagnostics show `gensys` failing on the assembled matrices, with `eu=(0,0)` and QZ reordering failure due to ill-conditioning.

4. There is artifact drift between saved reports and builder logic.
- Saved reports in `dsge_latvia/docs/` do not fully align with the current system-building path and equation-selection logic.
- Rebuilt diagnostics must become the only source of truth.
- The current repo also shows a concrete system-size discrepancy: older saved reports reference a roughly 116-variable / 152-equation solved core, while the current theory variable list and catalog-driven builder point to a much larger core. This discrepancy must be explained rather than worked around.

5. The model still contains unresolved placeholders and implied parameters.
- Parameter registry entries and current calibration notes show that not all parameters are yet fully paper-grounded.
- Some blocks are structurally closed with assumptions that are practical but not yet publication-faithful.

## Recovery Phases

### Phase 1: Make the Model Runnable and Diagnostics Reproducible

Goals:

- define one clean bootstrap path for `dsge_latvia`
- ensure scripts run from source in a documented way
- regenerate reports from current code rather than relying on stale saved artifacts

Required outcomes:

- one canonical command sequence exists for steady state, linear-system build, determinacy, and IRFs
- diagnostics always rebuild from source before interpretation
- runtime failures caused by packaging or missing dependencies are removed

### Phase 2: Reconcile the Authoritative Core System

Goals:

- establish one authoritative equation set and one authoritative endogenous variable set
- remove drift between catalog, allowlist, generated artifacts, and saved reports
- distinguish structural equations from helper definitions, closures, and measurement equations

Required outcomes:

- the core dynamic system is square and reproducible
- every included equation is intentional and traceable
- every excluded equation is excluded for a documented reason
- the historical 116-variable / 152-equation core versus the larger current theory/core definition is explicitly reconciled

First tasks in this phase:

- explain the discrepancy between the older `linear_system_report.json` core and the larger current endogenous-variable / catalog-defined core
- declare one of `equations_catalog.yaml` or `equations_catalog_kk.yaml` as the authoritative catalog for recovery work
- archive, demote, or clearly relabel the non-authoritative catalog to prevent further drift
- resolve the `resource_wedge` exemption as one of two acceptable outcomes:
  - eliminate it by correcting goods-market or aggregation accounting
  - or document it explicitly as a deliberate aggregation residual

Phase 2 exit condition for the resource wedge:

- it must not remain as an unexplained allowlist entry

### Phase 3: Localize the Singular Block Incrementally

Goals:

- identify which block introduces singularity or non-determinacy
- avoid treating the model as one opaque matrix

Execution approach:

- rebuild the model in stages
- validate rank, conditioning, and root structure after each stage
- isolate the first block that causes failure
- use catalog `section` values as the staging boundaries so the recovery path is reproducible from repo metadata rather than ad hoc grouping

Recommended stage boundaries from current repo structure:

- `appendix_c_normalized_model`
- `fiscal_rule_equations`
- closure and regime equations
- foreign freeze or close equations
- shock processes

Special attention:

- map `freeze_*` and `close_*` equations explicitly before solving each stage
- treat these equations as the most likely source of over-determination or artificial closure unless proven otherwise

Priority suspects:

- labor-market and wage-setting block
- public/private capital aggregation and normalization
- financial-frictions closure
- government debt and fiscal-rule block
- foreign freeze equations and other repo-added closures, especially the `freeze_*` / `close_*` pattern

### Phase 4: Recover Determinacy and Stable IRFs

Goals:

- make the full core solve with `gensys`
- produce stable, interpretable impulse responses

Required outcomes:

- `eu=(1,1)` on the full structural core
- generated IRFs are finite, stable, and directionally reasonable
- solver robustness changes are only introduced after structural issues are resolved

### Phase 5: Validate Against Publications and Document Deviations

Goals:

- compare the recovered implementation against the paper structure
- document any remaining deviations explicitly

Required outcomes:

- each major block is mapped back to its publication source
- any remaining temporary closures or implied parameters are documented as deviations
- model limitations are stated clearly enough for another engineer or researcher to continue safely

## Decision Gates

### Decision Gate 1: Tooling Path

Options:

- keep the current custom Python stack
- migrate to a DSGE framework such as Snowdrop or gEconpy
- use a Dynare-bridge approach only if original `.mod` files from the authors are found

Framework notes:

- `Snowdrop` is a relevant candidate if a central-bank-style Python DSGE workflow is preferred and a YAML-oriented model definition is useful
- `gEconpy` is a relevant candidate if a more formal model-specification and Bayesian-estimation path is preferred
- `Pynare` is only useful if original Dynare model files are found and preserving that workflow becomes the least-risk option

Default decision:

- keep the current custom Python stack for recovery work unless original author code is found or a framework clearly reduces structural risk without forcing a full rewrite

Rationale:

- the current blocker is structural solvability, not lack of modeling abstractions
- framework migration should be treated as a controlled decision, not a reflex response to current failures
- catalog authority must be fixed before any framework comparison is trusted, otherwise migrations will only carry the current ambiguity into a new tool

### Decision Gate 2: Structural Recovery vs Estimation

Options:

- structural recovery first
- estimation pipeline in parallel

Default decision:

- structural recovery first, estimation deferred

Rationale:

- Bayesian estimation, likelihood evaluation, and posterior analysis are not credible until the structural core is square, reproducible, and solvable

## Acceptance Criteria

The recovery effort is considered successful when all of the following are true:

- a clean bootstrap path exists for `dsge_latvia`
- the steady-state contract is documented, reproducible, and justified
- the core dynamic system is square and reproducible from current source
- the first singular or non-determinate block has been explicitly identified and resolved
- the full core model solves with `eu=(1,1)`
- IRFs run successfully and are directionally consistent with the publications
- remaining deviations from the papers are documented explicitly

## Deferred Work

The following are outside the immediate recovery scope:

- Bayesian estimation
- Kalman filter likelihood evaluation
- MCMC and posterior diagnostics
- forecast evaluation and full empirical replication pipeline
- environmental or green-transition extensions
- newer fiscal-rule literature extensions built on top of the Latvia model

These should only begin after the structural model solves cleanly and source provenance is under control.

## Professional Estimation Target

Once structural recovery is complete, the next-stage target should be a professional estimation pipeline rather than ad hoc calibration only.

That later phase should include:

- calibration of well-known structural parameters
- estimation of shock and friction parameters
- a documented set of Latvian observables such as GDP, inflation, and government debt
- likelihood evaluation through a state-space or Kalman-filter workflow
- Bayesian estimation and posterior diagnostics

This section is intentionally deferred. The model must first be structurally faithful, square, reproducible, and solvable before estimation infrastructure is added.

## Additional Cross-Check Sources

After the base model is structurally recovered, later publications can be used as refinement and cross-check sources rather than as immediate implementation drivers.

Examples already identified:

- Bušs (2022) on fiscal, environmental, and bank-regulation policies in a small open economy for the green transition
- Bušs, Grüning, and Tkačevs (2024) on European fiscal rules in the *Baltic Journal of Economics*

These sources may help validate later extensions of the fiscal block, but they should not displace the 2020 working paper as the primary technical implementation source for the base model.

## Relationship to Existing Docs

- This document does not replace [PLAN.md](/Users/kuznecov/dev/www/economy/docs/PLAN.md:1).
- This document does not restate the full target architecture in [ARCHITECTURE_PRISM.md](/Users/kuznecov/dev/www/economy/docs/ARCHITECTURE_PRISM.md:1).
- For detailed source mapping, use the files under `dsge_latvia/docs/` and `dsge_latvia/model/`.

This file should remain concise, execution-oriented, and specific to recovering `dsge_latvia`.
