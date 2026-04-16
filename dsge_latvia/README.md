# Latvia Fiscal DSGE (Python rebuild)

This directory hosts a clean, audit-friendly rebuild of the Latvia Fiscal DSGE model in Python.

Scope (initial pass)
- Reproduce the full model equations using the 2020 working paper appendices.
- Use the 2023 journal version as narrative validation.
- Provide a Dynare-style model spec solvable via a Python `gensys` implementation.
- Track parameter provenance, data vintages, and transformations.

Status
- Fiscal block equations (main text) transcribed into `dsge_latvia/model/spec.yaml`.
- Non-fiscal and foreign block equations extracted to raw appendix files.
- Fiscal, non-fiscal, and foreign parameter tables transcribed into YAML.

## Bootstrap

Canonical local setup:

```bash
cd dsge_latvia
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

This project now supports editable install so imports like `lv_fiscal_dsge.*` work without relying on ad hoc `PYTHONPATH` state.

If you cannot use editable install, the fallback is:

```bash
cd dsge_latvia
PYTHONPATH=src python3 -m lv_fiscal_dsge.diagnostics
```

`python -m lv_fiscal_dsge.diagnostics` executes the `diagnostics` submodule directly. It does not require `diagnostics` to be re-exported from `lv_fiscal_dsge.__init__`.

## Canonical Commands

Run these from the `dsge_latvia/` directory after bootstrap:

```bash
python -m lv_fiscal_dsge.core_reconciliation
python -m lv_fiscal_dsge.stage_isolation
python -m lv_fiscal_dsge.stage4_foreign_freeze_analysis
python -m lv_fiscal_dsge.parameter_audit
python -m lv_fiscal_dsge.steady_state_contract
python scripts/build_linear_system.py
python scripts/run_determinacy_irf.py
python -m lv_fiscal_dsge.diagnostics
```

The diagnostics wrapper is the recommended entry point because it checks dependency/import health, reruns the main diagnostics sequence, and writes summary artifacts.

Console entry points are also installed for the package-native commands:

```bash
lv-dsge-core-reconcile
lv-dsge-stage-isolation
lv-dsge-stage4-freezes
lv-dsge-parameter-audit
lv-dsge-steady-state
lv-dsge-diagnostics
```

After an editable install, `lv-dsge-diagnostics` is the shortest equivalent to `python -m lv_fiscal_dsge.diagnostics`.

## Diagnostics Artifacts

Current diagnostics write or refresh:

- `docs/steady_state_report.json`
- `docs/replication_scoreboard.md`
- `docs/core_system_reconciliation.md`
- `docs/reports/core_system_reconciliation.json`
- `docs/stage_isolation.md`
- `docs/reports/stage_isolation_report.json`
- `docs/stage4_foreign_freezes.md`
- `docs/reports/stage4_foreign_freeze_analysis.json`
- `docs/reports/catalog_gate.json`
- `docs/linear_system_report.json`
- `docs/determinacy_report.json`
- `docs/diagnostics_summary.json`
- `docs/diagnostics_summary.md`

The diagnostics summary also surfaces the currently observed mismatch between the historical smaller linear-system core and the larger current theory/core definition without trying to resolve it in this tranche.
It should also be treated as the human-readable place to track currently known financial-frictions calibration gaps before Phase 3 structural work.

## Key Files

- `model/spec.yaml`
- `model/parameters_fiscal_calibrated.yaml`
- `model/parameters_fiscal_estimated.yaml`
- `model/parameters_nonfiscal_calibrated.yaml`
- `model/parameters_nonfiscal_estimated.yaml`
- `model/parameters_foreign_estimated.yaml`
- `docs/appendix_a_raw.txt`
- `docs/appendix_b_raw.txt`
- `docs/appendix_c_raw.txt`
- `docs/sources.md`

## Current Focus

This tranche is about reproducibility and observability, not structural repair:

- bootstrap/import path must be clean
- command surface must be explicit
- diagnostics must be regenerated from source
- failure state must be surfaced clearly

Structural reconciliation work such as catalog authority, `freeze_*` / `close_*` analysis, `resource_wedge` disposition, and determinacy repair is deferred to the next tranche.

Phase 3 tooling now exists to stage the build by canonical catalog sections and record the first failing stage. It does not repair the model automatically; it narrows the failure surface so the next structural edits can target the first stage that breaks.

Stage 4 also has a dedicated foreign-freeze transition analysis so the repo shows exactly what is added between Stage 3 and Stage 4 and which variables are being pinned by the `freeze_*` equations.
