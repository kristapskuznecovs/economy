# Audit checklist

Data provenance
- Record source, URL, and vintage for each observable.
- Record revision policy (real-time vs latest vintage).
- Store raw data in `data/raw/` and transformed data in `data/processed/`.

Transformations
- Document seasonal adjustment choice per series.
- Document deflators and chain-linking method.
- Store transformation code with explicit versioning.

Parameters
- Tag each parameter as calibrated or estimated.
- Store priors and posteriors with citation to the paper.
- Record any deviations from the original paper.

Model validation
- Replicate paper IRFs and variance decompositions.
- Run historical decomposition for known Latvian episodes.
- Backtest on a holdout period.

Robustness
- Sensitivity to calibrated parameters (import shares, transfer split, public capital share).
- Identify weakly identified fiscal rule parameters via prior-posterior plots.
- Subsample checks for structural breaks (EU accession, euro adoption, crisis years).
- Alternative public capital specification if available (Appendix E).
- Out-of-sample forecast evaluation for key fiscal observables.

Reproducibility
- Pin package versions.
- Track model spec hash for each run.
- Keep a run log with git commit, data vintage, and parameter version.
