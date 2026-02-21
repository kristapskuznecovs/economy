# Appendix A transcription (FOCs)

Source: Working Paper 5/2020, Appendix A.

## A.1 Model without public capital
(52) Cost minimization problem
- TC_t = τ_t^d * ω_t * R_t^f * L_t + τ_t^d * r_t^k * K_t + z_t^+ * φ

(53) Production function
- Y_t = (z_t * L_t)^(1-α) * ε_t * K_t^α − z_t^+ * φ

(54) FOC, capital
- τ_t^d * r_t^k = mc_t * (z_t L_t)^(1-α) * ε_t * α * K_t^(α−1)

(55) FOC, labor
- τ_t^d * R_t^f * ω_t = mc_t * (1−α) * z_t^(1−α) * L_t^(−α) * ε_t * K_t^α

(56) Normalized FOC (capital)
- τ_t^d * r̄_t^k = mc_t * α * ε_t * L_t^(1−α) * (k_t/(μ_{z+ ,t} μ_{ψ,t}))^(α−1)

(57) Normalized FOC (labor)
- τ_t^d * R_t^f * ω̄_t = mc_t * (1−α) * ε_t * L_t^(−α) * (k_t/(μ_{z+ ,t} μ_{ψ,t}))^α

(58) mc_t definition from (56)
- mc_t = [τ_t^d * r̄_t^k] / [α ε_t (k_t/(μ_{z+ ,t} μ_{ψ,t}))^(α−1)]

(59) mc_t definition from (57)
- mc_t = [τ_t^d * R_t^f * ω̄_t] / [(1−α) ε_t (k_t/(μ_{z+ ,t} μ_{ψ,t} L_t))^α]

(60) Capital-labor ratio
- k_t/(μ_{z+ ,t} μ_{ψ,t}) = (R_t^f * ω̄_t * L_t / r̄_t^k) * α/(1−α)

(61) mc_t simplified
- mc_t = (τ_t^d/ε_t) * (1/α)^α * (1/(1−α))^(1−α) * (r̄_t^k)^α * (R_t^f * ω̄_t)^(1−α)

## A.2 Model with public capital in CES bundle
(62) Cost minimization problem
- TC_t = τ_t^d * ω_t * R_t^f * L_t + τ_t^d * r_t^k * K_t + z_t^+ * φ

(63) Production function
- Y_t = (z_t * L_t)^(1−α) * ε_t * K̃_t^α − z_t^+ * φ

(64) CES capital bundle
- K̃_t = ( α_k^(1/ν_k) * K_t^((ν_k−1)/ν_k) + (1−α_k)^(1/ν_k) * K_{g,t}^((ν_k−1)/ν_k) )^(ν_k/(ν_k−1))

(65) FOC, capital (CES)
- τ_t^d * r_t^k = mc_t * (z_t L_t)^(1−α) * ε_t * α * α_k^(1/ν_k) * K̃_t^(α+1/ν_k−1) * K_t^(−1/ν_k)

(66) FOC, labor (CES)
- τ_t^d * R_t^f * ω_t = mc_t * (1−α) * z_t^(1−α) * L_t^(−α) * ε_t * K̃_t^α

(67) Normalized FOC (capital, CES)
- τ_t^d * r̄_t^k = mc_t * α * α_k^(1/ν_k) * ε_t * L_t^(1−α) * (K̃_t/(μ_{z+ ,t} μ_{ψ,t}))^(α+1/ν_k−1) * (k_t/(μ_{z+ ,t} μ_{ψ,t}))^(−1/ν_k)

(68) Normalized FOC (labor, CES)
- τ_t^d * R_t^f * ω̄_t = mc_t * (1−α) * ε_t * L_t^(−α) * (K̃_t/(μ_{z+ ,t} μ_{ψ,t}))^α

(69) mc_t definition from (67)
- mc_t = [τ_t^d * r̄_t^k] / [α α_k^(1/ν_k) ε_t (K̃_t/(μ_{z+ ,t} μ_{ψ,t}))^(α+1/ν_k−1) (k_t/(μ_{z+ ,t} μ_{ψ,t}))^(−1/ν_k)]

(70) mc_t definition from (68)
- mc_t = [τ_t^d * R_t^f * ω̄_t] / [(1−α) ε_t (K̃_t/(μ_{z+ ,t} μ_{ψ,t} L_t))^α]

(71) Capital-labor ratio (CES)
- k_t/(μ_{z+ ,t} μ_{ψ,t}) = (r̄_t^k / (R_t^f * ω̄_t * L_t))^(−ν_k) * ((1−α)/α)^(−ν_k) * α_k * (K̃_t/(μ_{z+ ,t} μ_{ψ,t}))^(1−ν_k)

(72) mc_t simplified (variant 1)
- mc_t = (τ_t^d/ε_t) * (K̃_t/(μ_{z+ ,t} μ_{ψ,t} L_t))^(−α) * (R_t^f * ω̄_t)/(1−α)

(73) Capital bundle ratio (variant)
- K̃_t/(μ_{z+ ,t} μ_{ψ,t}) = (r̄_t^k/(R_t^f * ω̄_t * L_t))^(ν_k/(1−ν_k)) * ((1−α)/α)^(ν_k/(1−ν_k)) * α_k^(ν_k−1) * (k_t/(μ_{z+ ,t} μ_{ψ,t}))^(1/(1−ν_k))

(74) mc_t simplified (variant 2)
- mc_t = (τ_t^d/ε_t) * (R_t^f * ω̄_t)^(α ν_k/(1−ν_k)) * (r̄_t^k)^(α ν_k/(ν_k−1)) * (α)^(α ν_k/(1−ν_k)) * (α_k)^(α/(1−ν_k)) * (1−α)^(α ν_k/(ν_k−1) − 1) * (k_t/(μ_{z+ ,t} μ_{ψ,t} L_t))^(α/(ν_k−1))

## A.3 Model with public capital as additional production factor
(75) Cost minimization problem
- TC_t = τ_t^d * ω_t * R_t^f * L_t + τ_t^d * r_t^k * K_t + z_t^+ * φ

(76) Production function
- Y_t = z_t^(1−α−α_k) * L_t^(1−α) * ε_t * K_t^α * K_{G,t}^{α_k} − z_t^+ * φ

(77) FOC, capital
- τ_t^d * r_t^k = mc_t * z_t^(1−α−α_k) * L_t^(1−α) * ε_t * α * K_t^(α−1) * K_{G,t}^{α_k}

(78) FOC, labor
- τ_t^d * R_t^f * ω_t = mc_t * (1−α) * z_t^(1−α−α_k) * L_t^(−α) * ε_t * K_t^α * K_{G,t}^{α_k}

(79) Normalized FOC (capital)
- τ_t^d * r̄_t^k = mc_t * α * ε_t * L_t^(1−α) * (k_t/(μ_{z+ ,t} μ_{ψ,t}))^(α−1) * (k_{G,t}/(μ_{z+ ,t} μ_{ψ,t}))^(α_k)

(80) Normalized FOC (labor)
- τ_t^d * R_t^f * ω̄_t = mc_t * (1−α) * ε_t * L_t^(−α) * (k_t/(μ_{z+ ,t} μ_{ψ,t}))^α * (k_{G,t}/(μ_{z+ ,t} μ_{ψ,t}))^(α_k)

(81) Redefinition of z_t^+
- z_t^+ = ψ_t^{(α+α_k)/(1−α−α_k)} * z_t

(82) mc_t definition from (79)
- mc_t = [τ_t^d * r̄_t^k] / [α ε_t (k_t/(μ_{z+ ,t} μ_{ψ,t} L_t))^(α−1) (k_{G,t}/(μ_{z+ ,t} μ_{ψ,t}))^(α_k)]

(83) mc_t definition from (80)
- mc_t = [τ_t^d * R_t^f * ω̄_t] / [(1−α) ε_t (k_t/(μ_{z+ ,t} μ_{ψ,t} L_t))^α (k_{G,t}/(μ_{z+ ,t} μ_{ψ,t}))^(α_k)]

(84) Capital-labor ratio
- k_t/(μ_{z+ ,t} μ_{ψ,t}) = (R_t^f * ω̄_t * L_t / r̄_t^k) * α/(1−α)

(85) mc_t simplified
- mc_t = (τ_t^d/ε_t) * (1/α)^α * (1/(1−α))^(1−α) * (r̄_t^k)^α * (R_t^f * ω̄_t)^(1−α) * (k_{G,t}/(μ_{z+ ,t} μ_{ψ,t}))^(−α_k)

Notes
- All equations transcribed directly from Appendix A images. Verify symbols with the core block before implementing.
