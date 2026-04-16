# Stage Isolation Report

- Generated: `2026-04-16T19:41:52.320177+00:00`

## Dependency Health

- `numpy`: installed
- `scipy`: installed
- `yaml`: installed

## Stages

- `Stage 1: Appendix C Core`: ok with sections `appendix_c_normalized_model`
  purpose: Baseline normalized-model block without fiscal rules, closures, or shocks.
  report: `docs/reports/stage1_appendix_c_core_linear_system_report.json`
  gate counts: eqs=`122` vars=`163` shocks=`1`
- `Stage 2: Add Fiscal Rules`: ok with sections `appendix_c_normalized_model, equations, fiscal_rule_equations`
  purpose: Add fiscal-rule and pricing equations (incl. R_g,t definition from 'equations' section).
  report: `docs/reports/stage2_add_fiscal_rules_linear_system_report.json`
  gate counts: eqs=`131` vars=`163` shocks=`9`
- `Stage 3: Add Closure Equations`: ok with sections `appendix_c_normalized_model, equations, fiscal_rule_equations, closure_equations`
  purpose: Introduce closure equations and check whether over-determination starts here.
  report: `docs/reports/stage3_add_closures_linear_system_report.json`
  gate counts: eqs=`139` vars=`163` shocks=`9`
  suspect equations: `close_gamma_g, close_d_f, close_xi_A, close_xi_B, close_mu_zplus, close_mu_psi, close_Psi, close_phi_a_shock`
- `Stage 4: Add Foreign Freezes`: ok with sections `appendix_c_normalized_model, equations, fiscal_rule_equations, closure_equations, foreign_freeze_equations`
  purpose: Add frozen foreign equations and measure the effect of `freeze_*` closures.
  report: `docs/reports/stage4_add_foreign_freezes_linear_system_report.json`
  gate counts: eqs=`143` vars=`163` shocks=`9`
  suspect equations: `freeze_R_star, freeze_pi_star, freeze_s, freeze_yf, close_gamma_g, close_d_f, close_xi_A, close_xi_B, close_mu_zplus, close_mu_psi, close_Psi, close_phi_a_shock`
- `Stage 5: Add Shock Processes`: ok with sections `appendix_c_normalized_model, equations, fiscal_rule_equations, closure_equations, foreign_freeze_equations, shock_processes`
  purpose: Full current staged core with shock processes added last.
  report: `docs/reports/stage5_add_shocks_linear_system_report.json`
  gate counts: eqs=`166` vars=`167` shocks=`25`
  suspect equations: `freeze_R_star, freeze_pi_star, freeze_s, freeze_yf, close_gamma_g, close_d_f, close_xi_A, close_xi_B, close_mu_zplus, close_mu_psi, close_Psi, close_phi_a_shock`
