"""
Simplified DSGE Fiscal Solver (MVP)

This implements a steady-state fiscal impact calculator using the Latvia DSGE model.
Based on equations from dsge_latvia/model/spec.yaml (eq04-eq35).

Simplifications for MVP:
- Steady-state analysis (no full dynamics)
- Fiscal block only (core DSGE block deferred)
- Linear approximations around calibrated steady state
- Uses calibrated parameters from YAML files
"""

import math
from dataclasses import dataclass
from typing import Dict, Literal


@dataclass
class FiscalParameters:
    """Calibrated fiscal parameters from Table 1 (Working Paper 5/2020)."""

    # Steady-state ratios
    eta_g: float = 0.38  # Government spending / GDP
    dgy: float = 0.30  # Public debt / annual GDP
    omega_h: float = 0.10  # Share of public debt held domestically

    # Tax rates (steady state)
    tau_k: float = 0.10  # Capital income tax
    tau_w_e: float = 0.155  # SSC employer rate
    tau_w_w: float = 0.061  # SSC employee rate
    tau_c: float = 0.21  # Consumption tax
    tau_y: float = 0.164  # Labor income tax

    # Government spending composition
    tau_c_g: float = 0.463  # Public consumption share
    tau_i_g: float = 0.117  # Public investment share
    tau_tr_g: float = 0.300  # Transfers share

    # Transfer distribution
    tau_r_tr: float = 0.70  # Share to restricted households

    # Production parameters
    alpha: float = 0.33  # Capital share in production
    alpha_k: float = 0.85  # Private capital share in capital bundle

    # Import shares
    omega_g_c: float = 0.13  # Import share in public consumption
    omega_g_i: float = 0.45  # Import share in public investment

    # Elasticities (estimated posterior modes from Table 2)
    nu_c: float = 0.50  # Substitution elasticity private/public consumption
    nu_k: float = 0.15  # Substitution elasticity private/public capital
    eta_g_c: float = 1.30  # Armington elasticity public consumption
    eta_g_i: float = 1.46  # Armington elasticity public investment

    # Multipliers (calibrated from literature)
    fiscal_multiplier_transfers: float = 0.8  # Transfer multiplier
    fiscal_multiplier_consumption: float = 1.1  # Government consumption multiplier
    fiscal_multiplier_investment: float = 1.3  # Government investment multiplier

    # Labor market
    lambda_r: float = 0.35  # Share of restricted (liquidity-constrained) households
    mpc_restricted: float = 0.95  # Marginal propensity to consume (restricted HH)
    mpc_optimizing: float = 0.30  # Marginal propensity to consume (optimizing HH)

    # Adjustment dynamics
    adjustment_speed_short: float = 0.40  # Quarterly adjustment speed (year 1)
    adjustment_speed_medium: float = 0.25  # Quarterly adjustment speed (year 2-5)
    adjustment_speed_long: float = 0.15  # Quarterly adjustment speed (year 6+)


@dataclass
class FiscalShock:
    """Representation of a fiscal policy shock."""

    # Expenditure shocks (millions EUR)
    delta_transfers: float = 0.0  # Change in transfers
    delta_gov_consumption: float = 0.0  # Change in government consumption
    delta_gov_investment: float = 0.0  # Change in government investment

    # Tax rate shocks (percentage point changes)
    delta_tau_c: float = 0.0  # Change in consumption tax rate
    delta_tau_y: float = 0.0  # Change in labor income tax rate
    delta_tau_w_e: float = 0.0  # Change in employer SSC rate
    delta_tau_w_w: float = 0.0  # Change in employee SSC rate


@dataclass
class SteadyState:
    """Steady-state values for the economy."""

    # Baseline GDP (millions EUR, approximate 2021 Latvia)
    gdp: float

    # Derived values
    government_spending: float  # = eta_g * gdp
    transfers: float  # = tau_tr_g * government_spending
    gov_consumption: float  # = tau_c_g * government_spending
    gov_investment: float  # = tau_i_g * government_spending

    # Labor market (approximate 2021 Latvia)
    employment_total: int
    unemployment_rate: float


class SimplifiedFiscalSolver:
    """
    Simplified steady-state fiscal impact solver.

    This is an MVP implementation that:
    1. Takes fiscal shocks as input
    2. Computes first-round effects using fiscal multipliers
    3. Applies adjustment dynamics over time
    4. Returns GDP, employment, and fiscal impacts

    Future (v2): Replace with full DSGE solution using Gensys algorithm.
    """

    def __init__(self, params: FiscalParameters | None = None):
        self.params = params or FiscalParameters()
        self.steady_state = self._compute_steady_state()

    def _compute_steady_state(self) -> SteadyState:
        """Compute baseline steady state from parameters."""
        gdp = 32_000.0  # Baseline GDP (millions EUR)
        gov_spending = self.params.eta_g * gdp

        return SteadyState(
            gdp=gdp,
            government_spending=gov_spending,
            transfers=self.params.tau_tr_g * gov_spending,
            gov_consumption=self.params.tau_c_g * gov_spending,
            gov_investment=self.params.tau_i_g * gov_spending,
            employment_total=900_000,
            unemployment_rate=0.075,
        )

    def solve_fiscal_shock(self, shock: FiscalShock) -> Dict[str, any]:
        """
        Compute economic impacts of a fiscal shock.

        Returns impacts at 1, 5, and 15 year horizons.
        """
        # First-round GDP impact (using fiscal multipliers)
        gdp_impact_transfers = shock.delta_transfers * self.params.fiscal_multiplier_transfers
        gdp_impact_consumption = (
            shock.delta_gov_consumption * self.params.fiscal_multiplier_consumption
        )
        gdp_impact_investment = (
            shock.delta_gov_investment * self.params.fiscal_multiplier_investment
        )

        # Tax impacts on GDP (supply-side effects)
        # Tax increases reduce labor supply and consumption
        effective_labor_tax_change = (
            shock.delta_tau_y + shock.delta_tau_w_e + shock.delta_tau_w_w
        )
        gdp_impact_labor_tax = (
            -effective_labor_tax_change * 0.01 * self.steady_state.gdp * 1.2
        )  # Elasticity ~1.2
        gdp_impact_consumption_tax = (
            -shock.delta_tau_c * 0.01 * self.steady_state.gdp * 0.5
        )  # Elasticity ~0.5

        # Total first-round GDP impact
        gdp_impact_first_round = (
            gdp_impact_transfers
            + gdp_impact_consumption
            + gdp_impact_investment
            + gdp_impact_labor_tax
            + gdp_impact_consumption_tax
        )

        # Employment impact (Okun's law approximation: 1% GDP ≈ 0.5% employment)
        employment_elasticity = 0.5
        employment_impact_first_round = (
            (gdp_impact_first_round / self.steady_state.gdp)
            * employment_elasticity
            * self.steady_state.employment_total
        )

        # Budget balance impact
        # Revenue effect = -expenditure shock + tax rate changes * tax base
        revenue_impact = (
            -(shock.delta_transfers + shock.delta_gov_consumption + shock.delta_gov_investment)
            + (shock.delta_tau_c * 0.01 * self.steady_state.gdp * 0.6)  # Consumption tax base
            + (
                effective_labor_tax_change * 0.01 * self.steady_state.gdp * 0.5
            )  # Labor tax base
        )

        # Expenditure impact (including automatic stabilizers)
        expenditure_impact = shock.delta_transfers + shock.delta_gov_consumption + shock.delta_gov_investment

        budget_balance_impact = revenue_impact - expenditure_impact

        # Compute time path using adjustment dynamics
        horizons = []
        for year in [1, 5, 15]:
            quarters = year * 4

            # Adjustment speed (faster in short run, slower in long run)
            if year == 1:
                speed = self.params.adjustment_speed_short
            elif year <= 5:
                speed = self.params.adjustment_speed_medium
            else:
                speed = self.params.adjustment_speed_long

            # Realized fraction: sum of geometric series
            # Realized = sum_{q=1}^{quarters} speed * (1-speed)^(q-1)
            # = 1 - (1-speed)^quarters
            realized_fraction = 1 - (1 - speed) ** quarters

            # Scale first-round impacts by realized fraction
            gdp_impact = gdp_impact_first_round * realized_fraction
            employment_impact = employment_impact_first_round * realized_fraction
            budget_impact = budget_balance_impact * realized_fraction

            # GDP as percentage
            gdp_pct = (gdp_impact / self.steady_state.gdp) * 100

            # Inflation impact (simple Phillips curve: output gap → inflation)
            # Positive demand shock → positive inflation
            inflation_impact = gdp_pct * 0.3  # Phillips curve slope ~0.3

            horizons.append(
                {
                    "year": year,
                    "gdp_impact_eur_m": round(gdp_impact, 1),
                    "gdp_real_pct": round(gdp_pct, 2),
                    "employment_jobs": round(employment_impact),
                    "budget_balance_eur_m": round(budget_impact, 1),
                    "revenues_eur_m": round(revenue_impact * realized_fraction, 1),
                    "expenditures_eur_m": round(-expenditure_impact * realized_fraction, 1),
                    "inflation_pp": round(inflation_impact, 2),
                    "realized_fraction": round(realized_fraction, 2),
                }
            )

        return {
            "horizons": horizons,
            "shock": shock,
            "multipliers": {
                "transfers": self.params.fiscal_multiplier_transfers,
                "consumption": self.params.fiscal_multiplier_consumption,
                "investment": self.params.fiscal_multiplier_investment,
            },
            "first_round": {
                "gdp_impact_eur_m": round(gdp_impact_first_round, 1),
                "employment_jobs": round(employment_impact_first_round),
            },
        }

    def interpret_policy_to_shock(self, policy_text: str) -> FiscalShock:
        """
        Interpret natural language policy into a fiscal shock.

        MVP: Simple keyword-based interpretation.
        v2: Replace with LLM-based policy parser.
        """
        policy_lower = policy_text.lower()

        shock = FiscalShock()

        # Pension pillar keywords
        if "pension" in policy_lower and "pillar" in policy_lower:
            # 2nd pension pillar in Latvia is ~€200M/year in transfers
            if "remov" in policy_lower or "cut" in policy_lower or "elimin" in policy_lower:
                shock.delta_transfers = -200.0  # Remove €200M in transfers
            elif "increas" in policy_lower or "expand" in policy_lower:
                shock.delta_transfers = 200.0

        # Transfer keywords
        elif "transfer" in policy_lower:
            if "increas" in policy_lower:
                shock.delta_transfers = 100.0  # Generic increase
            elif "cut" in policy_lower or "reduc" in policy_lower:
                shock.delta_transfers = -100.0

        # Health spending
        elif "health" in policy_lower:
            if "increas" in policy_lower:
                shock.delta_gov_consumption = 100.0
            elif "cut" in policy_lower:
                shock.delta_gov_consumption = -100.0

        # Defence spending
        elif "defence" in policy_lower or "defense" in policy_lower:
            if "increas" in policy_lower:
                shock.delta_gov_consumption = 50.0
            elif "cut" in policy_lower:
                shock.delta_gov_consumption = -50.0

        # Education spending
        elif "education" in policy_lower:
            if "increas" in policy_lower:
                shock.delta_gov_consumption = 80.0
            elif "cut" in policy_lower:
                shock.delta_gov_consumption = -80.0

        # Infrastructure/investment
        elif "infrastructure" in policy_lower or "investment" in policy_lower:
            if "increas" in policy_lower:
                shock.delta_gov_investment = 150.0
            elif "cut" in policy_lower:
                shock.delta_gov_investment = -150.0

        # Tax changes
        elif "tax" in policy_lower:
            # Consumption tax (VAT)
            if ("vat" in policy_lower or "consumption" in policy_lower) and "tax" in policy_lower:
                if "increas" in policy_lower or "rais" in policy_lower:
                    shock.delta_tau_c = 1.0  # +1 percentage point
                elif "cut" in policy_lower or "reduc" in policy_lower:
                    shock.delta_tau_c = -1.0

            # Income tax
            elif "income" in policy_lower and "tax" in policy_lower:
                if "increas" in policy_lower or "rais" in policy_lower:
                    shock.delta_tau_y = 1.0
                elif "cut" in policy_lower or "reduc" in policy_lower:
                    shock.delta_tau_y = -1.0

        return shock
