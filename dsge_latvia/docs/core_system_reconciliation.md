# Core System Reconciliation

- Generated: `2026-04-16T19:36:15.414694+00:00`

## Catalog Authority

- Canonical catalog: `model/catalogs/equations_catalog.yaml`
- Canonical entry count: `235`
- Legacy catalog: `model/catalogs/equations_catalog_kk.yaml`
- Legacy entry count: `111`
- Decision: `model/catalogs/equations_catalog.yaml` is authoritative for recovery work.

## 116 vs 167 Core Drift

- Historical linear-system report: `116` variables / `152` equations
- Historical selection note: `allowlist_row_pivot`
- Legacy QR variable list: `116` variables
- Theory variable list: `34` variables
- Variables only in legacy list: `100`
- Variables only in theory list: `18`

The 116-variable historical core comes from the older QR-pivot allowlist and a reduced Phase 1 linearization report. The 167-variable theory list is the newer theory-driven allowlist consumed by build_linear_system.py. These represent different system definitions, not a single consistent core.

## Freeze / Close Inventory

- `freeze_*` equations: `4`
- `close_*` equations: `8`
- `freeze_R_star`: Temporary closure (Freeze foreign rate at steady state until SVAR block is wired.)
- `freeze_pi_star`: Temporary closure (Freeze foreign inflation at steady state until SVAR block is wired.)
- `freeze_yf`: Temporary closure (Freeze foreign demand at steady state until SVAR block is wired.)
- `freeze_s`: Temporary closure (Freeze nominal exchange rate growth at steady state until SVAR block is wired.)
- `close_gamma_g`: Temporary closure (Hold wasteful spending at steady-state share.)
- `close_d_f`: Temporary closure (Dividend flow held at zero pending firm profit accounting.)
- `close_xi_A`: Temporary closure (no notes)
- `close_xi_B`: Temporary closure (no notes)
- `close_mu_zplus`: Temporary closure (no notes)
- `close_mu_psi`: Temporary closure (no notes)
- `close_Psi`: Appendix C, Eq. (C.1) (no notes)
- `close_phi_a_shock`: Temporary closure (no notes)

## Resource Wedge

- Allowlist path: `model/steady_state_allowlist.yaml`
- Exempted: `True`
- Current note: `Resource constraint wedge (D_t + Z_t); Appendix C Eq. (C.94).`
- Resolution target: eliminate it through corrected accounting or document it explicitly as a deliberate aggregation residual.
