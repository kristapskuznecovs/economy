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

Key files
- `dsge_latvia/model/spec.yaml`
- `dsge_latvia/model/parameters_fiscal_calibrated.yaml`
- `dsge_latvia/model/parameters_fiscal_estimated.yaml`
- `dsge_latvia/model/parameters_nonfiscal_calibrated.yaml`
- `dsge_latvia/model/parameters_nonfiscal_estimated.yaml`
- `dsge_latvia/model/parameters_foreign_estimated.yaml`
- `dsge_latvia/docs/appendix_a_raw.txt`
- `dsge_latvia/docs/appendix_b_raw.txt`
- `dsge_latvia/docs/appendix_c_raw.txt`

Next steps
- Map Appendix A/B equations into structured model blocks in `spec.yaml`.
- Implement linearization and `gensys` solver.
- Add data ingestion and transformations for observables.

See `dsge_latvia/docs/sources.md` for source notes.
