# Equation Trace (RBEC Appendix)

Each entry lists: variable → equation reference → economic meaning → units → steady state value (if reported).

Notes:
- “Real” means deflated by the domestic price level.
- If a steady state value is not explicitly reported, it is marked as `n/a`.
- Equation references are to `rbec_a_2173915_sm4059.pdf` unless stated otherwise.

## Calibration / Estimated Parameters

- `alpha` → Table A.1, p.2 → Capital share in production → share → 0.4000
- `alpha_k` → Journal Table 1, p.17 → Private-capital weight in CES bundle → share → 0.8500
- `nu_k` → Journal Table 2, p.21 → Substitution elasticity (private vs public capital) → elasticity → n/a (estimated)
- `mu_z` → Table A.1, p.2 → Steady-state neutral technology growth → gross growth → 1.0031
- `mu_psi` → Table A.1, p.2 → Steady-state investment technology growth → gross growth → 1.0000
- `pi_bar` → Table A.1, p.2 → Steady-state gross inflation target → gross inflation → 1.0043
- `omega_c` → Table A.1, p.2 → Import share in consumption → share → 0.4500
- `omega_i` → Table A.1, p.2 → Import share in investment → share → 0.6500
- `omega_x` → Table A.1, p.2 → Import share in exports → share → 0.3300
- `lambda_r` → Table A.1, p.2 → Share of restricted households → share → 0.5000

## Production and Costs

- `TC_t` → Eq. (E.1), p.48 → Total cost of intermediate goods firm → nominal cost → n/a
- `Y_t` → Eq. (E.2), p.48 → Intermediate goods output → real output → n/a
- `z_t` → Eq. (B.17), p.9 → Stationary neutral technology shock → level → 1 (steady state)
- `eps_t` → Eq. (B.17), p.9 → Stationary production technology shock → level → 1 (steady state)
- `z_t_plus` → Eq. (B.17), p.9 → Technology term scaling fixed costs → level → n/a
- `psi_t` → Eq. (B.17), p.9; Eq. (C.1), p.29 → Investment-specific technology level → level → n/a
- `phi` → Eq. (B.17), p.9 → Fixed production cost → real output units → n/a
- `K_t` → Eq. (E.1–E.2), p.48 → Private capital stock → real capital → n/a
- `K_g_t` → Eq. (B.18), p.9 → Public capital services (CES bundle) → real capital services → n/a
- `K_G_t` → Eq. (E.24–E.27), p.49 → Public capital stock (add’l factor) → real capital → n/a
- `K_tilde_t` → Eq. (B.18), p.9 → CES bundle of private/public capital → real capital services → n/a
- `L_t` → Eq. (E.1–E.2), p.48 → Labor input (H_t in appendix) → hours/labor services → n/a
- `mc_t` → Eq. (E.3–E.4), p.48 → Nominal marginal cost (MC_t) → nominal cost per unit → n/a

## Wages, Rates, and Wedges

- `omega_t` → Eq. (B.4) text, p.6 → Real gross wage per unit of labor services (W_t / P_t) → real wage → n/a
- `R_t_f` → Eq. (B.19), p.10 → Gross nominal rate for working-capital financing → gross rate → n/a
- `r_t_k` → Eq. (B.6) text, p.7; Eq. (B.20) note, p.10 → Rental rate of capital services (nominal, scaled by P_t) → real rental rate → n/a
- `tau_t_d` → Eq. (B.20) note, p.10 → Tax-like shock on marginal cost (not in production) → wedge → 1 (steady state)

## Normalization / Scaling

- `k_t` → Eq. (C.1), p.29; Eq. (C.2), p.30 → Normalized private capital (`k_t = K_t/(z_t^+ Ψ_t)`, `k_t = k̄_t u_t`) → stationary capital → n/a
- `k_G_t` → Eq. (C.1), p.29 → Normalized public capital (`k_G,t = K_G,t/z_t^+`) → stationary capital → n/a
- `w_bar_t` → Eq. (C.1), p.29 → Normalized real wage (`w̄_t = W_t/(P_t z_t^+)`) → stationary real wage → n/a
- `p_k0_t` → Eq. (C.1), p.29 → Scaled price of new installed capital (`p_k0,t = Ψ_t P_k0,t / P_t`) → relative price → n/a
- `r_bar_t_k` → Eq. (C.1), p.29 → Normalized rental rate (`r̄_t^k = Ψ_t r_t^k`) → stationary rental rate → n/a
- `omega_bar_t` → Eq. (C.99–C.100), p.44 → Entrepreneur idiosyncratic productivity cutoff (financial frictions) → dimensionless → n/a
