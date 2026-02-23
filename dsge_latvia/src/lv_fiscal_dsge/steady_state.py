from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import math

import yaml
from scipy.optimize import root
from scipy.stats import norm


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "model"


@dataclass
class SteadyState:
    output: float
    consumption: float
    investment: float
    exports: float
    imports: float
    government: float
    government_consumption: float
    government_investment: float
    transfers: float
    transfers_restricted: float
    transfers_optimizing: float
    unemployment_benefits: float
    capital: float
    public_capital: float
    capital_bundle: float
    wage: float
    rental_rate: float
    marginal_cost: float
    markup: float
    wage_share: float
    capital_share: float
    consumption_output: float
    investment_output: float
    exports_output: float
    government_output: float
    imports_implied: float
    resource_wedge: float
    debt: float
    domestic_debt: float
    foreign_debt: float
    deficit: float
    taxes: float


def compute_residuals(ss: SteadyState, params: dict[str, float]) -> dict[str, float]:
    alpha = params["alpha"]
    lambda_d = params["lambda_d"]
    mu_zplus = _mu_zplus(params)
    mu_psi = params["mu_psi"]
    delta_g = params["delta_g"]
    tau_c_g = params["tau_c_g"]
    tau_i_g = params["tau_i_g"]
    tau_tr_g = params["tau_tr_g"]
    tau_r_tr = params["tau_r_tr"]
    lambda_r = params["lambda_r"]
    dgy = params["dgy"]

    residuals = {
        "wage_share": ss.wage_share - (1.0 - alpha) / lambda_d,
        "capital_share": ss.capital_share - alpha / lambda_d,
        "markup": ss.marginal_cost - 1.0 / lambda_d,
        "resource_wedge": ss.resource_wedge,
        "public_debt_target": ss.debt / (4.0 * ss.output) - dgy,
        "govt_consumption_share": ss.government_consumption / ss.government - tau_c_g,
        "govt_investment_share": ss.government_investment / ss.government - tau_i_g,
        "govt_transfer_share": ss.transfers / ss.government - tau_tr_g,
        "transfer_split_rule": (tau_r_tr * ss.transfers_optimizing)
        - ((1.0 - tau_r_tr) * ss.transfers_restricted),
        "transfer_aggregation": ss.transfers
        - (lambda_r * ss.transfers_restricted + (1.0 - lambda_r) * ss.transfers_optimizing),
        "public_capital_law": ss.public_capital
        - (ss.government_investment / (mu_zplus * mu_psi - (1.0 - delta_g))),
        "import_share": ss.imports - ss.imports_implied,
    }
    residuals.update(_wage_block_residuals(ss, params))
    residuals.update(_financial_frictions_residuals(ss, params))
    return residuals


def _wage_block_residuals(
    ss: SteadyState, params: dict[str, float]
) -> dict[str, float]:
    alpha = params["alpha"]
    beta = params["beta"]
    mu_zplus = _mu_zplus(params)
    mu_psi = params["mu_psi"]
    rho = params["rho_match"]
    L = params["L_bar"]
    tau_y = params["tau_y"]
    tau_w_w = params["tau_w_w"]
    tau_w_e = params["tau_w_e"]
    tau_t_d = params.get("tau_t_d", 1.0)
    pi_bar = params["pi_bar"]
    nu_work = params.get("nu_working_capital", 1.0)
    sigma_level = params["sigma_level"]
    sigma_match = params["sigma_match"]
    f_target = params["job_finding_rate"]
    Q_target = params.get("Q_bar", 0.0)
    vacancy_rate = params["vacancy_rate"]
    kappa_v = params.get("kappa_v", 0.0)
    kappa_h = params.get("kappa_h", 0.0)
    eta = params.get("eta", 0.5)
    bshare = params["bshare"]

    # Discounting in stationarized system.
    disc = beta / mu_zplus

    # Steady-state nominal rate under hard peg.
    R_nominal = pi_bar * mu_zplus / beta
    R_f = nu_work * R_nominal + (1.0 - nu_work)

    # Flow value of a match to the firm (scaled), from FOC for labor input.
    k_term = ss.capital / (mu_zplus * mu_psi)
    vartheta = (
        ss.marginal_cost
        * (1.0 - alpha)
        * (k_term**alpha)
        * (L ** (-alpha))
        / (tau_t_d * R_f)
    )

    vartheta_p = vartheta / (1.0 - rho * disc)
    w_bar = ss.wage
    w_p_bar = (1.0 + tau_w_e) * w_bar / (1.0 - rho * disc)
    w_p = (1.0 - tau_y - tau_w_w) * w_bar / (1.0 - rho * disc)
    j_bar = vartheta_p - w_p_bar

    gamma_match = vacancy_rate * L / (1.0 - rho * L)
    f_model = sigma_level * (gamma_match ** (1.0 - sigma_match))
    Q_model = sigma_level * (gamma_match ** (-sigma_match))

    A = (1.0 - rho) * disc / (1.0 - rho * disc)
    b_u = bshare * w_bar
    denom = 1.0 - f_model * A - (1.0 - f_model) * disc
    if denom == 0.0:
        raise RuntimeError("Wage block denominator is zero; check parameters.")
    X = (f_model * w_p + (1.0 - f_model) * b_u) / denom
    u_bar = b_u + disc * X
    v_bar = w_p + A * X

    bargaining_rhs = (
        ((1.0 + tau_w_e) / (1.0 - tau_y - tau_w_w))
        * ((1.0 - eta) / eta)
        * (v_bar - u_bar)
    )

    return {
        "matching_job_finding": f_model - f_target,
        "matching_vacancy_fill": Q_model - Q_target,
        "free_entry": Q_model * (j_bar - kappa_h) - kappa_v,
        "wage_bargaining": j_bar - bargaining_rhs,
    }


def compute_financial_frictions_metrics(
    ss: SteadyState, params: dict[str, float]
) -> dict[str, float]:
    mu_zplus = _mu_zplus(params)
    beta = params["beta"]
    pi_bar = params["pi_bar"]

    mu = params.get("mu", params.get("mu_monitoring"))
    if mu is None:
        raise RuntimeError("Missing monitoring cost parameter `mu` / `mu_monitoring`.")

    sigma_omega = params.get("sigma_omega", params.get("sigma_u"))
    if sigma_omega is None:
        raise RuntimeError("Missing idiosyncratic uncertainty parameter `sigma_u`.")
    if sigma_omega <= 0:
        raise RuntimeError("sigma_u must be positive for lognormal distribution.")

    F_omega_bar = params.get("F_omega_bar")
    if F_omega_bar is None:
        raise RuntimeError("Missing steady-state bankruptcy rate `F_omega_bar`.")
    if not (0.0 < F_omega_bar < 1.0):
        raise RuntimeError("F_omega_bar must lie in (0,1).")

    z = norm.ppf(F_omega_bar)
    ln_omega_bar = sigma_omega * z - 0.5 * sigma_omega * sigma_omega
    omega_bar = math.exp(ln_omega_bar)

    G = norm.cdf((math.log(omega_bar) - 0.5 * sigma_omega * sigma_omega) / sigma_omega)
    Gamma = omega_bar * (1.0 - F_omega_bar) + G
    share_to_banks = Gamma - mu * G

    n_ratio_target = params.get("net_worth_to_capital")
    p_k0 = 1.0

    gross_rate = pi_bar * mu_zplus / beta
    gross_return_capital = pi_bar * (
        (1.0 - params["tau_k"]) * ss.rental_rate
        + 1.0
        - params["delta"]
        + params["tau_k"] * params["delta"]
    )
    R_k_over_R = gross_return_capital / gross_rate

    n_ratio_implied = 1.0 - R_k_over_R * share_to_banks
    net_worth = n_ratio_implied * p_k0 * ss.capital

    transfer_target = params["W_over_y_times100"] / 100.0 * ss.output
    gamma = params["gamma"]
    A = gamma / (pi_bar * mu_zplus)
    rhs = A * (
        gross_return_capital * ss.capital
        - gross_rate * (ss.capital - net_worth)
        - mu * G * gross_return_capital * ss.capital
    )
    transfer_entrepreneurs = net_worth - rhs

    return {
        "mu": mu,
        "sigma_omega": sigma_omega,
        "F_omega_bar": F_omega_bar,
        "omega_bar": omega_bar,
        "G": G,
        "Gamma": Gamma,
        "share_to_banks": share_to_banks,
        "net_worth": net_worth,
        "net_worth_ratio": n_ratio_implied,
        "net_worth_ratio_target": n_ratio_target,
        "net_worth_ratio_gap": None if n_ratio_target is None else n_ratio_implied - n_ratio_target,
        "gross_rate": gross_rate,
        "gross_return_capital": gross_return_capital,
        "gross_return_ratio": R_k_over_R,
        "transfer_entrepreneurs": transfer_entrepreneurs,
        "transfer_entrepreneurs_target": transfer_target,
        "transfer_entrepreneurs_gap": transfer_entrepreneurs - transfer_target,
    }


def _financial_frictions_residuals(
    ss: SteadyState, params: dict[str, float]
) -> dict[str, float]:
    metrics = compute_financial_frictions_metrics(ss, params)
    mu_zplus = _mu_zplus(params)
    gamma = params["gamma"]
    pi_bar = params["pi_bar"]

    n = metrics["net_worth"]
    R = metrics["gross_rate"]
    R_k = metrics["gross_return_capital"]
    G = metrics["G"]
    mu = metrics["mu"]
    w_e = metrics["transfer_entrepreneurs"]
    share_to_banks = metrics["share_to_banks"]
    n_ratio = metrics["net_worth_ratio"]

    k = ss.capital
    rhs = (gamma / (pi_bar * mu_zplus)) * (R_k * k - R * (k - n) - mu * G * R_k * k) + w_e

    return {
        "net_worth_law": n - rhs,
        "bank_zero_profit": share_to_banks - (R / R_k) * (1.0 - n_ratio),
    }


def _load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
        if not isinstance(data, dict):
            raise ValueError(f"Expected dict in {path}")
        return data


def load_parameters() -> dict[str, float]:
    params: dict[str, float] = {}
    for name in (
        "parameters_nonfiscal_calibrated.yaml",
        "parameters_fiscal_calibrated.yaml",
        "parameters_nonfiscal_estimated.yaml",
        "parameters_fiscal_estimated.yaml",
    ):
        data = _load_yaml(MODEL_DIR / name)
        if isinstance(data, dict):
            # For estimated parameters, take posterior mode when available.
            if name.endswith("_estimated.yaml"):
                for key, value in data.items():
                    if isinstance(value, dict) and "posterior" in value:
                        params[key] = value["posterior"]["mode"]
                    elif isinstance(value, (int, float)):
                        params[key] = float(value)
            else:
                params.update(data)
    return params


def _mu_zplus(params: dict[str, float]) -> float:
    alpha = params["alpha"]
    mu_z = params["mu_z"]
    mu_psi = params["mu_psi"]
    return (mu_psi ** (alpha / (1.0 - alpha))) * mu_z


def solve_full_steady_state(params: dict[str, float]) -> SteadyState:
    alpha = params["alpha"]
    beta = params["beta"]
    delta = params["delta"]
    mu_zplus = _mu_zplus(params)
    mu_psi = params["mu_psi"]
    lambda_d = params["lambda_d"]
    L = params["L_bar"]
    c_y = params["consumption_to_output"]
    i_y = params["investment_to_output"]
    x_y = params["exports_to_output"]
    g_y = params["eta_g"]
    tau_c_g = params["tau_c_g"]
    tau_i_g = params["tau_i_g"]
    tau_tr_g = params["tau_tr_g"]
    omega_g_c = params["omega_g_c"]
    omega_g_i = params["omega_g_i"]
    tau_r_tr = params["tau_r_tr"]
    bshare = params["bshare"]
    dgy = params["dgy"]
    omega_h = params["omega_h"]
    pi_bar = params["pi_bar"]
    tau_k = params["tau_k"]
    lambda_r = params["lambda_r"]
    delta_g = params["delta_g"]
    alpha_k = params["alpha_k"]
    nu_k = params["nu_k"]

    # Euler-implied rental rate of capital (balanced growth).
    # Capital income taxation and depreciation allowance imply a higher pre-tax rental rate.
    r_k_target = (mu_zplus / beta - (1.0 - delta + tau_k * delta)) / (1.0 - tau_k)
    mc_target = 1.0 / lambda_d

    def residuals(x: list[float]) -> list[float]:
        y, c, i, x_exp, g, k, w, r_k, mc = x
        g_c = tau_c_g * g
        g_i = tau_i_g * g
        eq_y = y - 1.0
        eq_c = c - c_y * y
        eq_i = i - i_y * y
        eq_x = x_exp - x_y * y
        eq_g = g - g_y * y
        eq_mc = mc - mc_target
        eq_wage_share = w * L - (1.0 - alpha) * mc * y
        eq_capital_share = r_k * k - alpha * mc * y
        eq_rental = r_k - r_k_target
        return [
            eq_y,
            eq_c,
            eq_i,
            eq_x,
            eq_g,
            eq_mc,
            eq_wage_share,
            eq_capital_share,
            eq_rental,
        ]

    y0 = 1.0
    c0 = c_y * y0
    i0 = i_y * y0
    x0 = x_y * y0
    g0 = g_y * y0
    mc0 = mc_target
    k0 = alpha * mc0 / r_k_target
    w0 = (1.0 - alpha) * mc0 / L
    r0 = r_k_target

    x_init = [y0, c0, i0, x0, g0, k0, w0, r0, mc0]
    sol = root(residuals, x0=x_init, method="hybr")
    if not sol.success:
        raise RuntimeError(f"Steady-state solver failed: {sol.message}")

    y, c, i, x_exp, g, k, w, r_k, mc = sol.x
    g_c = tau_c_g * g
    g_i = tau_i_g * g
    tr = tau_tr_g * g
    split_denom = (lambda_r * tau_r_tr / (1.0 - tau_r_tr)) + (1.0 - lambda_r)
    tr_o = tr / split_denom
    tr_r = (tau_r_tr / (1.0 - tau_r_tr)) * tr_o
    unemployment_benefits = bshare * w * (1.0 - L)
    debt = 4.0 * dgy * y
    domestic_debt = omega_h * debt
    foreign_debt = debt - domestic_debt
    deficit = debt - debt / (mu_zplus * pi_bar)
    taxes = g - deficit
    imports_implied = (
        params["omega_c"] * c
        + params["omega_i"] * i
        + params["omega_x"] * x_exp
        + omega_g_c * g_c
        + omega_g_i * g_i
    )
    resource_wedge = y - (c + i + g_c + g_i + x_exp - imports_implied)
    mu_zpsi = mu_zplus * mu_psi
    denom = mu_zpsi - (1.0 - delta_g)
    if denom <= 0:
        raise RuntimeError("Public capital steady state denominator non-positive.")
    k_g = g_i / denom
    capital_bundle = (
        (alpha_k ** (1.0 / nu_k)) * (k ** ((nu_k - 1.0) / nu_k))
        + (1.0 - alpha_k) ** (1.0 / nu_k) * (k_g ** ((nu_k - 1.0) / nu_k))
    ) ** (nu_k / (nu_k - 1.0))
    wage_share = w * L / y
    capital_share = r_k * k / y

    return SteadyState(
        output=y,
        consumption=c,
        investment=i,
        exports=x_exp,
        imports=imports_implied,
        government=g,
        government_consumption=g_c,
        government_investment=g_i,
        transfers=tr,
        transfers_restricted=tr_r,
        transfers_optimizing=tr_o,
        unemployment_benefits=unemployment_benefits,
        capital=k,
        public_capital=k_g,
        capital_bundle=capital_bundle,
        wage=w,
        rental_rate=r_k,
        marginal_cost=mc,
        markup=lambda_d,
        wage_share=wage_share,
        capital_share=capital_share,
        consumption_output=c / y,
        investment_output=i / y,
        exports_output=x_exp / y,
        government_output=g / y,
        imports_implied=imports_implied,
        resource_wedge=resource_wedge,
        debt=debt,
        domestic_debt=domestic_debt,
        foreign_debt=foreign_debt,
        deficit=deficit,
        taxes=taxes,
    )


def check_steady_state(ss: SteadyState, params: dict[str, float]) -> dict[str, bool]:
    tol = 1e-6
    alpha = params["alpha"]
    lambda_d = params["lambda_d"]
    c_y = params["consumption_to_output"]
    i_y = params["investment_to_output"]
    x_y = params["exports_to_output"]
    g_y = params["eta_g"]
    tau_c_g = params["tau_c_g"]
    tau_i_g = params["tau_i_g"]
    tau_tr_g = params["tau_tr_g"]
    dgy = params["dgy"]
    tau_r_tr = params["tau_r_tr"]
    lambda_r = params["lambda_r"]
    mu_zplus = _mu_zplus(params)
    mu_psi = params["mu_psi"]
    delta_g = params["delta_g"]

    checks = {
        "wage_share_matches_alpha_and_markup": abs(
            ss.wage_share - (1.0 - alpha) / lambda_d
        )
        < tol,
        "capital_share_matches_alpha_and_markup": abs(
            ss.capital_share - alpha / lambda_d
        )
        < tol,
        "markup_matches_calibration": abs(ss.markup - lambda_d) < tol,
        "consumption_output_target": abs(ss.consumption_output - c_y) < tol,
        "investment_output_target": abs(ss.investment_output - i_y) < tol,
        "exports_output_target": abs(ss.exports_output - x_y) < tol,
        "government_output_target": abs(ss.government_output - g_y) < tol,
        "import_share_check": abs(ss.imports - ss.imports_implied) < 1e-4,
        "public_debt_target": abs(ss.debt / (4.0 * ss.output) - dgy) < tol,
        "govt_consumption_share": abs(ss.government_consumption / ss.government - tau_c_g)
        < tol,
        "govt_investment_share": abs(ss.government_investment / ss.government - tau_i_g)
        < tol,
        "govt_transfer_share": abs(ss.transfers / ss.government - tau_tr_g) < tol,
        "transfer_split_rule": abs(
            tau_r_tr * ss.transfers_optimizing
            - (1.0 - tau_r_tr) * ss.transfers_restricted
        )
        < 1e-8,
        "transfer_aggregation": abs(
            ss.transfers
            - (lambda_r * ss.transfers_restricted + (1.0 - lambda_r) * ss.transfers_optimizing)
        )
        < 1e-8,
        "public_capital_law": abs(
            ss.public_capital
            - (ss.government_investment / (mu_zplus * mu_psi - (1.0 - delta_g)))
        )
        < 1e-6,
        "tax_rates_in_unit_interval": all(
            0.0 <= params[name] < 1.0
            for name in ("tau_c", "tau_y", "tau_w_e", "tau_w_w", "tau_k")
        ),
    }
    return checks


def main() -> None:
    params = load_parameters()
    ss = solve_full_steady_state(params)
    checks = check_steady_state(ss, params)

    print("Steady-state summary")
    print(f"output (y): {ss.output:.6f}")
    print(f"capital/output (k/y): {ss.capital/ss.output:.6f}")
    print(f"public capital/output (k_g/y): {ss.public_capital/ss.output:.6f}")
    print(f"capital bundle/output (k_tilde/y): {ss.capital_bundle/ss.output:.6f}")
    print(f"rental rate (r_k): {ss.rental_rate:.6f}")
    print(f"wage (w): {ss.wage:.6f}")
    print(f"wage share (w*L/y): {ss.wage_share:.6f}")
    print(f"capital share (r_k*k/y): {ss.capital_share:.6f}")
    print(f"marginal cost (mc): {ss.marginal_cost:.6f}")
    print(f"markup (lambda_d): {ss.markup:.6f}")
    print(f"c/y: {ss.consumption_output:.6f}")
    print(f"i/y: {ss.investment_output:.6f}")
    print(f"x/y: {ss.exports_output:.6f}")
    print(f"g/y: {ss.government_output:.6f}")
    print(f"m/y: {ss.imports/ss.output:.6f}")
    print(f"g_c/y: {ss.government_consumption/ss.output:.6f}")
    print(f"g_i/y: {ss.government_investment/ss.output:.6f}")
    print(f"tr/y: {ss.transfers/ss.output:.6f}")
    print(f"unemp_benefits/y: {ss.unemployment_benefits/ss.output:.6f}")
    print(f"debt/y (annualized): {ss.debt/(4.0*ss.output):.6f}")
    print(f"deficit/y: {ss.deficit/ss.output:.6f}")
    print(f"taxes/y: {ss.taxes/ss.output:.6f}")
    print(f"imports implied/y: {ss.imports_implied/ss.output:.6f}")
    print(f"resource wedge/y: {ss.resource_wedge/ss.output:.6f}")

    print("\nChecks")
    for name, ok in checks.items():
        status = "OK" if ok else "FAIL"
        print(f"{name}: {status}")


if __name__ == "__main__":
    main()
