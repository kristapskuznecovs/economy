# Appendix A mapping steps (in progress)

Step 1: Transcribe equations
- Completed: Eq. (52)–(85) added to `dsge_latvia/model/spec.yaml`.

Step 2: Establish variable mapping
- Created `dsge_latvia/docs/variable_map.yaml` with verified vs. needs_review flags.
- Updated tau_t_d, R_t_f, r_t_k, omega_t using RBEC appendix (rbec_a_2173915_sm4059.pdf).
- Added Appendix C normalization refs for w_bar_t, r_bar_t_k, k_t, k_G_t; clarified omega_bar_t as financial cutoff.
- Added `dsge_latvia/docs/equation_trace.md` with equation references and units.

Step 3: Normalize variable naming
- Align Appendix A variables with core block naming used in the rest of the model.
- This will happen after Step 2 is verified.
