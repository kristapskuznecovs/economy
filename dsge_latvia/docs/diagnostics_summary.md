# DSGE Diagnostics Summary

- Generated: `2026-04-16T19:36:15.371497+00:00`
- Root: `/Users/kuznecov/dev/www/economy/dsge_latvia`

## Environment

- Bootstrap status: `ok`
- Python: `/opt/homebrew/opt/python@3.14/bin/python3.14`
- Package location: `/Users/kuznecov/dev/www/economy/dsge_latvia/src/lv_fiscal_dsge/__init__.py`

## Dependencies

- `numpy`: missing (ModuleNotFoundError: No module named 'numpy')
- `scipy`: missing (ModuleNotFoundError: No module named 'scipy')
- `pandas`: missing (ModuleNotFoundError: No module named 'pandas')
- `pyyaml`: missing (ModuleNotFoundError: No module named 'yaml')
- `sympy`: missing (ModuleNotFoundError: No module named 'sympy')

## Commands

- `core_system_reconciliation`: ok (returncode `0`)
- `stage_isolation`: ok (returncode `0`)
- `stage4_foreign_freeze_analysis`: ok (returncode `0`)
- `parameter_audit`: failed (returncode `1`)
- `steady_state_contract`: failed (returncode `1`)
- `build_linear_system`: failed (returncode `1`)
- `run_determinacy_irf`: failed (returncode `1`)

## Core Size Snapshot

- Saved linear-system report source: `docs/linear_system_report.json`
- Theory variable source: `model/endogenous_variables_theory.yaml`
- Theory variable count: `166`
- Saved linear-system counts: `116` variables / `152` equations
- Discrepancy observed: `True`

## Determinacy

- Stable roots: `19`
- Unstable roots: `97`
- `eu`: `(0, 0)`
- Solve error: `ValueError: Reordering of (A, B) failed because the transformed matrix pair (A, B) would be too far from generalized Schur form; the problem is very ill-conditioned. (A, B) may have been partially reordered.`

## Financial Frictions Calibration

- Source: `docs/steady_state_report.json`
- Net worth ratio: implied `0.478` vs target `0.700` (gap `-0.222`)
- Entrepreneur transfers: implied `0.177` vs target `0.001` (gap `0.176`)
- Note: these are large calibration mismatches. They do not block Phase 1, but they should stay on the Phase 3 suspect list when the financial-frictions block is reconciled.

## Artifacts

- `docs/core_system_reconciliation.md`
- `docs/reports/core_system_reconciliation.json`
- `docs/stage_isolation.md`
- `docs/reports/stage_isolation_report.json`
- `docs/stage4_foreign_freezes.md`
- `docs/reports/stage4_foreign_freeze_analysis.json`
- `docs/steady_state_report.json`
- `docs/replication_scoreboard.md`
- `docs/reports/catalog_gate.json`
- `docs/linear_system_report.json`
- `docs/determinacy_report.json`
