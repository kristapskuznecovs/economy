from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Callable

import numpy as np
import yaml
from scipy.linalg import qr
from scipy.stats import norm

from lv_fiscal_dsge.steady_state import (
    load_parameters,
    solve_full_steady_state,
    compute_financial_frictions_metrics,
    _mu_zplus,
)


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "model"
DOCS_DIR = ROOT / "docs"

TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
SKIP_RE = re.compile(r"int_0|sum_\{|\bsum\{|\bdj\b")
SKIP_INDEX_RE = re.compile(r"_[j],t(?:[+-]1)?")


def _load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _collect_equations(spec: dict, section: str) -> list[dict]:
    entries = spec.get(section, [])
    return [e for e in entries if isinstance(e, dict) and e.get("raw")]


def _split_equations(raw: str) -> list[str]:
    return [part.strip() for part in raw.split(";") if part.strip()]


def _normalize_expr(expr: str) -> str:
    expr = expr.replace("^", "**")
    expr = expr.replace("ln(", "log(")
    expr = expr.replace("S''(", "S_tilde_double_prime(")
    expr = expr.replace("S'(", "S_tilde_prime(")
    expr = expr.replace("a'(", "a_prime(")
    expr = re.sub(r"\ba\(", "a_util(", expr)
    expr = expr.replace("E_t", "").replace("E_0", "")
    expr = expr.replace("E_t[", "(").replace("E_0[", "(")
    expr = expr.replace("{", "(").replace("}", ")")
    expr = expr.replace("[", "(").replace("]", ")")
    expr = re.sub(r"([A-Za-z0-9]),([A-Za-z0-9])", r"\1_\2", expr)
    expr = expr.replace("_t+1", "_t_p1").replace("_t-1", "_t_m1")
    expr = expr.replace("t+1", "t_p1").replace("t-1", "t_m1")
    expr = re.sub(r"([A-Za-z_][A-Za-z0-9_]*_t[A-Za-z0-9_]*)\+1\b", r"\1_p1", expr)
    expr = re.sub(r"([A-Za-z_][A-Za-z0-9_]*_t[A-Za-z0-9_]*)-1\b", r"\1_m1", expr)
    expr = re.sub(r"_t_p1_([A-Za-z0-9_]+)", r"_t_\1_p1", expr)
    expr = re.sub(r"_t_m1_([A-Za-z0-9_]+)", r"_t_\1_m1", expr)
    expr = expr.replace(";", ",")
    return expr


def _to_residual(expr: str) -> str:
    if "=" in expr:
        parts = expr.split("=")
        if len(parts) >= 2:
            lhs = parts[0].strip()
            rhs = parts[1].strip()
            return f"({lhs}) - ({rhs})"
    return expr


def _build_eval_env(params: dict[str, float]) -> dict[str, object]:
    mu_zplus = _mu_zplus(params)
    S_dd = params.get("S_dd", 0.0)

    def S_tilde(x: float) -> float:
        if S_dd == 0:
            return 0.0
        return 0.5 * (
            math.exp(math.sqrt(S_dd) * (x - mu_zplus * params["mu_psi"]))
            + math.exp(-math.sqrt(S_dd) * (x - mu_zplus * params["mu_psi"]))
            - 2.0
        )

    def S_tilde_prime(x: float) -> float:
        if S_dd == 0:
            return 0.0
        return 0.5 * math.sqrt(S_dd) * (
            math.exp(math.sqrt(S_dd) * (x - mu_zplus * params["mu_psi"]))
            - math.exp(-math.sqrt(S_dd) * (x - mu_zplus * params["mu_psi"]))
        )

    def S_tilde_double_prime(x: float) -> float:
        if S_dd == 0:
            return 0.0
        return 0.5 * S_dd * (
            math.exp(math.sqrt(S_dd) * (x - mu_zplus * params["mu_psi"]))
            + math.exp(-math.sqrt(S_dd) * (x - mu_zplus * params["mu_psi"]))
        )

    sigma_a = params.get("sigma_a", 0.0)
    sigma_b = params.get("sigma_b", 0.0)

    def a_util(u: float) -> float:
        return 0.5 * sigma_b * sigma_a * u * u + sigma_b * (1.0 - sigma_a) * u + sigma_b * (
            sigma_a / 2.0 - 1.0
        )

    def a_util_prime(u: float) -> float:
        return sigma_b * sigma_a * u + sigma_b * (1.0 - sigma_a)

    def G_func(omega: float, sigma: float) -> float:
        if sigma <= 0 or omega <= 0:
            return 0.0
        return float(norm.cdf((math.log(omega) - 0.5 * sigma * sigma) / sigma))

    def Gamma_func(omega: float, sigma: float) -> float:
        if sigma <= 0 or omega <= 0:
            return 0.0
        F = float(norm.cdf((math.log(omega) + 0.5 * sigma * sigma) / sigma))
        G = G_func(omega, sigma)
        return omega * (1.0 - F) + G

    def G_omega_func(omega: float, sigma: float) -> float:
        if sigma <= 0 or omega <= 0:
            return 0.0
        a = (math.log(omega) - 0.5 * sigma * sigma) / sigma
        return float(norm.pdf(a) / (omega * sigma))

    def Gamma_omega_func(omega: float, sigma: float) -> float:
        if sigma <= 0 or omega <= 0:
            return 0.0
        a = (math.log(omega) - 0.5 * sigma * sigma) / sigma
        b = (math.log(omega) + 0.5 * sigma * sigma) / sigma
        F = float(norm.cdf(b))
        phi_a = float(norm.pdf(a))
        phi_b = float(norm.pdf(b))
        return (1.0 - F) - phi_b / sigma + phi_a / (omega * sigma)

    env: dict[str, object] = {
        "log": math.log,
        "exp": math.exp,
        "min": min,
        "max": max,
        "S_tilde": S_tilde,
        "S_tilde_prime": S_tilde_prime,
        "S_tilde_double_prime": S_tilde_double_prime,
        "a_util": a_util,
        "a_prime": a_util_prime,
        "G": G_func,
        "Gamma": Gamma_func,
        "G_omega": G_omega_func,
        "Gamma_omega": Gamma_omega_func,
    }
    env.update(params)
    env["mu_zplus"] = mu_zplus
    env.setdefault("a", 0.0)
    env.setdefault("rho", params.get("rho_match", params.get("rho", 0.0)))
    env.setdefault("mu", params.get("mu", params.get("mu_monitoring", 0.0)))
    # Steady-state gross rates for convenience if used as constants.
    if "beta" in params and "pi_bar" in params:
        env.setdefault("R", params["pi_bar"] * mu_zplus / params["beta"])
        env.setdefault("R_star", params["pi_bar"] * mu_zplus / params["beta"])
    if "b_habit" in params:
        env["b"] = params["b_habit"]
    return env


def _steady_state_map(params: dict[str, float]) -> dict[str, float]:
    ss = solve_full_steady_state(params)
    fin = compute_financial_frictions_metrics(ss, params)
    mu_zplus = _mu_zplus(params)
    mu_psi = params["mu_psi"]
    beta = params["beta"]
    pi_bar = params["pi_bar"]
    R_bar = pi_bar * mu_zplus / beta
    alpha = params["alpha"]
    L = params.get("L_bar", 1.0)
    rho = params.get("rho_match", params.get("rho", 0.0))
    disc = beta / mu_zplus
    tau_y = params.get("tau_y", 0.0)
    tau_w_w = params.get("tau_w_w", 0.0)
    tau_w_e = params.get("tau_w_e", 0.0)
    tau_t_d = params.get("tau_t_d", 1.0)
    nu_work = params.get("nu_working_capital_d", params.get("nu_working_capital", 0.0))
    R_f = nu_work * R_bar + (1.0 - nu_work)

    k_term = ss.capital / (mu_zplus * mu_psi)
    vartheta = (
        ss.marginal_cost * (1.0 - alpha) * (k_term**alpha) * (L ** (-alpha)) / (tau_t_d * R_f)
        if L > 0
        else 1.0
    )
    vartheta_p = vartheta / (1.0 - rho * disc) if (1.0 - rho * disc) != 0 else vartheta
    w_bar = ss.wage
    w_p_bar = (1.0 + tau_w_e) * w_bar / (1.0 - rho * disc) if (1.0 - rho * disc) != 0 else w_bar
    w_t_p = (1.0 - tau_y - tau_w_w) * w_bar / (1.0 - rho * disc) if (1.0 - rho * disc) != 0 else w_bar

    f_bar = params.get("job_finding_rate", 0.0)
    v_rate = params.get("vacancy_rate", 0.0)
    searchers = 1.0 - rho * L
    chi = f_bar * searchers / L if L > 0 else 0.0
    Q_bar = params.get("Q_bar", 1.0)
    Q = chi / v_rate if v_rate else Q_bar
    A = (1.0 - rho) * disc / (1.0 - rho * disc) if (1.0 - rho * disc) != 0 else 0.0
    b_u = params.get("bshare", 0.0) * w_bar
    denom = 1.0 - f_bar * A - (1.0 - f_bar) * disc
    if denom != 0.0:
        X = (f_bar * w_t_p + (1.0 - f_bar) * b_u) / denom
        u_bar = b_u + disc * X
        v_bar = w_t_p + A * X
        u_tilde = u_bar - b_u
        a_w = v_bar - w_t_p
    else:
        u_bar = 1.0
        v_bar = 1.0
        u_tilde = 1.0
        a_w = 1.0

    mapping = {
        "y_t": ss.output,
        "Y_t": ss.output,
        "y": ss.output,
        "c_t": ss.consumption,
        "c_o_t": ss.consumption,
        "c_r_t": ss.consumption,
        "i_t": ss.investment,
        "i_tot_t": ss.investment,
        "x_t": ss.exports,
        "g_t": ss.government,
        "g_c_t": ss.government_consumption,
        "g_i_t": ss.government_investment,
        "g_c_exp": ss.government_consumption,
        "g_i_exp": ss.government_investment,
        "tr": ss.transfers,
        "tr_t": ss.transfers,
        "k_t": ss.capital / (mu_zplus * mu_psi),
        "k_bar_t": ss.capital / (mu_zplus * mu_psi),
        "k_G_t": ss.public_capital,
        "w_t": ss.wage,
        "w_bar_t": w_bar,
        "v_t": v_rate,
        "chi_t": chi,
        "Q_t": Q,
        "f_t": f_bar,
        "rho_t": rho,
        "r_t_k": ss.rental_rate,
        "R_t_k": fin["gross_return_capital"],
        "R_t": fin["gross_rate"],
        "R_t_f": R_f,
        "mc_t": ss.marginal_cost,
        "pi_t": pi_bar,
        "pi_c_t": pi_bar,
        "pi_i_t": pi_bar,
        "pi_g_c_t": pi_bar,
        "pi_g_i_t": pi_bar,
        "pi_t_star": pi_bar,
        "pi_t_star_x": pi_bar,
        "pi_t_star_m_c": pi_bar,
        "pi_t_star_m_i": pi_bar,
        "pi_t_star_m_x": pi_bar,
        "R_t": R_bar,
        "R_t_star": R_bar,
        "R_g_t": R_bar,
        "psi_zplus_t": 1.0,
        "psi_zrplus_t": 1.0,
        "gamma_t": params.get("gamma", 1.0),
        "phi_t": 1.0,
        "omega_bar_t": fin["omega_bar"],
        "sigma_t": fin["sigma_omega"],
        "n_t": fin["net_worth"],
        "vartheta_t": vartheta,
        "vartheta_p_t": vartheta_p,
        "v_bar_t": v_bar,
        "u_bar_t": u_bar,
        "u_tilde_t": u_tilde,
        "a_w_t": a_w,
        "w_p_t": w_p_bar,
        "w_t_p": w_t_p,
        "p_k_t": 1.0,
        "p_k0_t": 1.0,
        "P_k0_t": 1.0,
        "P_t": 1.0,
        "P_t_k": 1.0,
        "P_t_star": 1.0,
        "P_t_x": 1.0,
        "P_t_m_c": 1.0,
        "P_t_m_i": 1.0,
        "P_t_m_x": 1.0,
        "V_t_N": 1.0,
        "K_bar_t_N": 1.0,
        "Phi_t": 1.0,
        "Phi_g_t": 1.0,
        "s_t": 1.0,
        "p_f_t": 1.0,
        "mu_zplus_t": mu_zplus,
        "mu_psi_t": mu_psi,
        "mu_z_t": params["mu_z"],
        "eps_t": 1.0,
        "eps_z_t": 1.0,
        "eps_psi_t": 1.0,
        "eps_c_t": 1.0,
    }
    # Tax rates at steady state.
    for name in ("tau_c", "tau_y", "tau_w_e", "tau_w_w", "tau_k", "tau_b", "tau_ls"):
        key = f"{name}_t"
        if name in params:
            mapping[key] = params[name]
    return mapping


def _build_residual_functions(
    equations: list[dict],
    params: dict[str, float],
) -> tuple[list[str], list[Callable[[dict[str, float]], float]], list[str], list[dict]]:
    residuals: list[str] = []
    ids: list[str] = []
    skipped: list[dict] = []
    for entry in equations:
        raw = entry.get("raw", "")
        for part in _split_equations(raw):
            if SKIP_RE.search(part) or SKIP_INDEX_RE.search(part):
                skipped.append({"id": entry.get("id", ""), "reason": "indexed_or_integral"})
                continue
            if "gamma_g" in part and params.get("gamma_g", 0.0) == 0.0:
                skipped.append({"id": entry.get("id", ""), "reason": "gamma_g_zero"})
                continue
            expr = _normalize_expr(part)
            expr = _to_residual(expr)
            residuals.append(expr)
            ids.append(entry.get("id", ""))

    env = _build_eval_env(params)

    funcs: list[Callable[[dict[str, float]], float]] = []
    compiled: list[str] = []
    for expr, eq_id in zip(residuals, ids):
        try:
            code = compile(expr, "<equation>", "eval")
        except SyntaxError:
            skipped.append({"id": eq_id, "reason": "syntax_error"})
            continue

        def _make_func(code_obj):
            def _f(values: dict[str, float]) -> float:
                local_env = env.copy()
                local_env.update(values)
                return float(eval(code_obj, {"__builtins__": {}}, local_env))

            return _f

        funcs.append(_make_func(code))
        compiled.append(expr)

    return compiled, funcs, ids[: len(compiled)], skipped


def _strip_time_shift(token: str) -> str:
    if token.endswith("_p1"):
        token = token[:-3]
    if token.endswith("_m1"):
        token = token[:-3]
    if "_t_p1" in token:
        token = token.replace("_t_p1", "_t")
    if "_t_m1" in token:
        token = token.replace("_t_m1", "_t")
    return token


def _collect_variables(residuals: list[str], params: dict[str, float]) -> list[str]:
    param_names = set(params.keys()) | {"mu_zplus"}
    function_names = {
        "log",
        "exp",
        "min",
        "max",
        "S_tilde",
        "S_tilde_prime",
        "S_tilde_double_prime",
        "a_util",
        "a_prime",
        "G",
        "Gamma",
        "G_omega",
        "Gamma_omega",
    }
    vars_t: set[str] = set()
    for expr in residuals:
        for tok in TOKEN_RE.findall(expr):
            if tok in function_names:
                continue
            if tok in param_names:
                continue
            if tok.startswith("eps_") and tok.count("_") >= 2:
                # Innovation shocks belong in psi, not the endogenous state vector.
                continue
            base = _strip_time_shift(tok)
            if "_t" in base:
                vars_t.add(base)
    return sorted(vars_t)


def _collect_shocks(residuals: list[str]) -> list[str]:
    shocks: set[str] = set()
    for expr in residuals:
        for tok in TOKEN_RE.findall(expr):
            if tok.startswith("eps_") and tok.count("_") >= 2:
                shocks.add(tok)
    return sorted(shocks)


def _numeric_jacobian(
    funcs: list[Callable[[dict[str, float]], float]],
    values: dict[str, float],
    var_list: list[str],
    eps: float,
) -> np.ndarray:
    base = np.array([f(values) for f in funcs], dtype=float)
    jac = np.zeros((len(funcs), len(var_list)))
    for j, var in enumerate(var_list):
        orig = values.get(var, 1.0)
        h = eps if abs(orig) < 1.0 else eps * abs(orig)
        values[var] = orig + h
        f_plus = np.array([f(values) for f in funcs], dtype=float)
        values[var] = orig - h
        f_minus = np.array([f(values) for f in funcs], dtype=float)
        values[var] = orig
        jac[:, j] = (f_plus - f_minus) / (2.0 * h)
    return jac


def _lag_name(var: str) -> str:
    return f"{var}_m1"


def _lead_name(var: str) -> str:
    return f"{var}_p1"


def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    spec = _load_yaml(MODEL_DIR / "spec.yaml")
    params = load_parameters()

    # Build residuals from the normalized model plus fiscal rules and shock processes.
    sections = ["appendix_c_normalized_model", "fiscal_rule_equations", "shock_processes"]
    equations = []
    for section in sections:
        equations.extend(_collect_equations(spec, section))
    residuals, funcs, ids, skipped = _build_residual_functions(equations, params)
    full_variables = _collect_variables(residuals, params)
    variables = list(full_variables)
    allowlist_path = MODEL_DIR / "endogenous_variables.yaml"
    allowlist_note = None
    if allowlist_path.exists():
        allowlist = _load_yaml(allowlist_path) or {}
        allow_vars = allowlist.get("variables", [])
        allow_vars = [v for v in allow_vars if isinstance(v, str)]
        missing = [v for v in allow_vars if v not in full_variables]
        if missing:
            raise RuntimeError(
                "endogenous_variables.yaml contains variables not present in model equations: "
                + ", ".join(missing)
            )
        variables = allow_vars
        allowlist_note = allowlist.get("notes")
    shocks = _collect_shocks(residuals)

    ss_map = _steady_state_map(params)
    # Use the full variable set for steady-state evaluation.
    values = {var: ss_map.get(var, 1.0) for var in full_variables}
    # Provide steady-state constants even if they are not in the endogenous set.
    values.update(ss_map)
    for shock in shocks:
        values[shock] = ss_map.get(shock, 0.0)

    # Add lag/lead values for evaluation.
    for var in list(full_variables):
        values[_lag_name(var)] = values[var]
        values[_lead_name(var)] = values[var]

    eps = 1e-6
    # Drop equations that fail to evaluate at the steady state baseline.
    eval_ok_funcs = []
    eval_ok_ids = []
    eval_skipped = []
    for func, eq_id in zip(funcs, ids):
        try:
            _ = func(values)
            eval_ok_funcs.append(func)
            eval_ok_ids.append(eq_id)
        except Exception as exc:  # pragma: no cover - defensive
            eval_skipped.append({"id": eq_id, "reason": f"eval_error:{type(exc).__name__}"})

    funcs = eval_ok_funcs
    ids = eval_ok_ids

    allowed_skip_reasons = {"indexed_or_integral"}
    unexpected_skips = [
        item
        for item in (skipped + eval_skipped)
        if item.get("reason") not in allowed_skip_reasons
    ]
    if unexpected_skips:
        raise RuntimeError(
            "Core completeness gate failed; unexpected skipped equations: "
            + json.dumps(unexpected_skips, indent=2)
        )

    g0 = _numeric_jacobian(funcs, values, variables, eps=eps)
    g1 = _numeric_jacobian(funcs, values, [_lag_name(v) for v in variables], eps=eps)
    pi = _numeric_jacobian(funcs, values, [_lead_name(v) for v in variables], eps=eps)
    psi = _numeric_jacobian(funcs, values, shocks, eps=eps) if shocks else np.zeros((len(funcs), 0))

    # Drop equations that generate non-finite Jacobian entries.
    finite_mask = (
        np.isfinite(g0).all(axis=1)
        & np.isfinite(g1).all(axis=1)
        & np.isfinite(pi).all(axis=1)
        & np.isfinite(psi).all(axis=1)
    )
    dropped_nonfinite = [eq_id for eq_id, keep in zip(ids, finite_mask) if not keep]
    if not finite_mask.all():
        g0 = g0[finite_mask, :]
        g1 = g1[finite_mask, :]
        pi = pi[finite_mask, :]
        psi = psi[finite_mask, :]
        ids = [eq_id for eq_id, keep in zip(ids, finite_mask) if keep]
        funcs = [func for func, keep in zip(funcs, finite_mask) if keep]

    # Select a square subset of equations/variables if needed.
    selected_rows = list(range(g0.shape[0]))
    selected_cols = list(range(g0.shape[1]))
    m, n = g0.shape
    selection_note = "none"
    if allowlist_note:
        if m < n:
            raise RuntimeError(
                "Endogenous allowlist produces underdetermined system: "
                f"equations={m}, variables={n}."
            )
        if m > n:
            M = np.hstack([g0, g1, pi])
            _, _, piv = qr(M.T, pivoting=True, mode="economic")
            selected_rows = sorted(piv[:n].tolist())
            g0 = g0[selected_rows, :]
            g1 = g1[selected_rows, :]
            pi = pi[selected_rows, :]
            psi = psi[selected_rows, :]
            ids = [ids[i] for i in selected_rows]
            selection_note = "allowlist_row_pivot"
        else:
            selection_note = "allowlist"
    elif m > n:
        M = np.hstack([g0, g1, pi])
        _, _, piv = qr(M.T, pivoting=True, mode="economic")
        selected_rows = sorted(piv[:n].tolist())
        g0 = g0[selected_rows, :]
        g1 = g1[selected_rows, :]
        pi = pi[selected_rows, :]
        psi = psi[selected_rows, :]
        ids = [ids[i] for i in selected_rows]
        selection_note = "row_pivot"
    elif m < n:
        # Use column pivoting on g0 to select a square system.
        _, _, piv = qr(g0, pivoting=True, mode="economic")
        selected_cols = sorted(piv[:m].tolist())
        g0 = g0[:, selected_cols]
        g1 = g1[:, selected_cols]
        pi = pi[:, selected_cols]
        variables = [variables[i] for i in selected_cols]
        selection_note = "col_pivot"

    np.savez_compressed(
        MODEL_DIR / "linear_system.npz",
        g0=g0,
        g1=g1,
        c=np.zeros((g0.shape[0], 1)),
        psi=psi,
        pi=pi,
        variables=np.array(variables, dtype=object),
        shocks=np.array(shocks, dtype=object),
    )

    report = {
        "equation_count": len(funcs),
        "variable_count": len(variables),
        "shock_count": len(shocks),
        "selected_rows": selected_rows,
        "selected_cols": selected_cols,
        "used_section": sections,
        "skipped_equations": skipped + eval_skipped,
        "dropped_nonfinite": dropped_nonfinite,
        "selection_note": selection_note,
        "endogenous_allowlist": allowlist_note,
        "notes": "Proto linearization: equations filtered for indexed/integral forms; "
        "steady-state values default to 1 when unknown.",
    }
    (DOCS_DIR / "linear_system_report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
