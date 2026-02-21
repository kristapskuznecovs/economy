"""DSGE-based simulation engine using the Latvia fiscal DSGE model."""

from datetime import datetime

from ..model.aggregates import SimulationResults
from ..model.value_objects import (
    ConfidenceLevel,
    HorizonImpact,
    InvestmentImpact,
    RegionalImpact,
)
from .dsge_fiscal_solver import SimplifiedFiscalSolver

LATVIA_REGIONS = ["Riga", "Pieriga", "Kurzeme", "Zemgale", "Vidzeme", "Latgale"]

REGION_WEIGHTS = {
    "Riga": 0.42,
    "Pieriga": 0.18,
    "Kurzeme": 0.12,
    "Zemgale": 0.09,
    "Vidzeme": 0.10,
    "Latgale": 0.09,
}


class DSGESimulationEngine:
    """
    DSGE-based simulation engine.

    Uses the simplified fiscal DSGE solver to compute economic impacts.
    MVP: Steady-state + adjustment dynamics.
    v2: Full dynamic DSGE solution with Gensys.
    """

    def __init__(self):
        self.solver = SimplifiedFiscalSolver()

    def simulate(self, policy_text: str) -> SimulationResults:
        """
        Run DSGE simulation for a given policy.

        Steps:
        1. Parse policy text into fiscal shock
        2. Solve DSGE model for impacts
        3. Generate regional and investment breakdowns
        4. Return structured results
        """
        # Step 1: Parse policy into fiscal shock
        shock = self.solver.interpret_policy_to_shock(policy_text)

        # Step 2: Solve for economic impacts
        solution = self.solver.solve_fiscal_shock(shock)

        # Step 3: Build horizon impacts
        horizon_impacts = []
        for horizon in solution["horizons"]:
            horizon_impacts.append(
                HorizonImpact(
                    year=horizon["year"],
                    budget_balance_eur_m=horizon["budget_balance_eur_m"],
                    revenues_eur_m=horizon["revenues_eur_m"],
                    expenditures_eur_m=horizon["expenditures_eur_m"],
                    gdp_real_pct=horizon["gdp_real_pct"],
                    employment_jobs=horizon["employment_jobs"],
                    inflation_pp=horizon["inflation_pp"],
                )
            )

        # Step 4: Generate regional impacts (distribute national impacts by region)
        regional_impacts = []
        for horizon in solution["horizons"]:
            year = horizon["year"]
            national_gdp_pct = horizon["gdp_real_pct"]
            national_employment = horizon["employment_jobs"]

            for region, weight in REGION_WEIGHTS.items():
                regional_gdp_pct = national_gdp_pct * weight
                regional_employment = int(national_employment * weight)

                # Regional income tax and spending (proportional to GDP impact)
                income_tax_impact = horizon["revenues_eur_m"] * weight * 0.4  # ~40% from income tax
                social_spending = abs(horizon["expenditures_eur_m"]) * weight * 0.3  # ~30% social

                regional_impacts.append(
                    RegionalImpact(
                        area=region,
                        year=year,
                        gdp_real_pct=round(regional_gdp_pct, 2),
                        employment_jobs=regional_employment,
                        income_tax_eur_m=round(income_tax_impact, 1),
                        social_spending_eur_m=round(social_spending, 1),
                        direction=(
                            "increase"
                            if regional_employment > 0
                            else ("decrease" if regional_employment < 0 else "neutral")
                        ),
                    )
                )

        # Step 5: Generate investment impacts
        investment_impacts = []
        for horizon in solution["horizons"]:
            year = horizon["year"]
            gdp_impact = horizon["gdp_impact_eur_m"]

            # Investment responds to GDP changes (accelerator effect)
            # Public investment: direct from shock
            public_inv = shock.delta_gov_investment * horizon["realized_fraction"]

            # Private investment: responds to GDP with elasticity ~1.5
            private_inv = gdp_impact * 0.3  # ~30% of GDP impact is investment

            # FDI: responds more slowly, long-run elasticity ~0.5
            fdi_multiplier = 0.1 if year == 1 else (0.3 if year == 5 else 0.5)
            fdi_inv = gdp_impact * fdi_multiplier * 0.15

            total_inv = public_inv + private_inv + fdi_inv

            explanation = self._get_investment_explanation(year)

            investment_impacts.append(
                InvestmentImpact(
                    year=year,
                    public_investment_eur_m=round(public_inv, 1),
                    private_investment_eur_m=round(private_inv, 1),
                    fdi_investment_eur_m=round(fdi_inv, 1),
                    total_investment_eur_m=round(total_inv, 1),
                    direction="increase" if total_inv > 0 else "decrease",
                    explanation=explanation,
                )
            )

        # Step 6: Build narrative components
        policy_changes = self._describe_policy_changes(shock)
        causal_chain = self._build_causal_chain(shock, solution)
        winners, losers = self._identify_winners_losers(shock, solution)

        # Build complete results
        return SimulationResults(
            scenario_id=f"dsge_{int(datetime.utcnow().timestamp())}",
            title=policy_text[:60] + "..." if len(policy_text) > 60 else policy_text,
            policy_changes=policy_changes,
            horizon_impacts=horizon_impacts,
            regional_impacts=regional_impacts,
            investment_impacts=investment_impacts,
            model_name="Latvia Fiscal DSGE Model",
            model_version="1.0.0-simplified",
            confidence=ConfidenceLevel.MEDIUM,
            assumptions=[
                "Steady-state analysis with adjustment dynamics",
                "Fiscal multipliers from empirical literature (0.8-1.3)",
                "Regional impacts distributed by employment share",
                "No major external shocks or structural breaks",
                "Linear approximations around calibrated steady state",
            ],
            caveats=[
                "Simplified steady-state model (full dynamics in v2)",
                "Does not capture behavioral migration effects",
                "Regional multipliers approximated from national model",
                "Long-term projections carry increasing uncertainty",
                "Supply-side constraints not fully modeled",
            ],
            causal_chain=causal_chain,
            key_drivers=[
                f"Fiscal multiplier: {solution['multipliers']['transfers']:.1f}x (transfers)",
                f"Fiscal multiplier: {solution['multipliers']['consumption']:.1f}x (consumption)",
                f"Fiscal multiplier: {solution['multipliers']['investment']:.1f}x (investment)",
                "Household consumption response via disposable income",
                "Regional concentration following employment patterns",
            ],
            winners=winners,
            losers=losers,
        )

    def _describe_policy_changes(self, shock) -> list[str]:
        """Generate human-readable policy change descriptions."""
        changes = []

        if shock.delta_transfers != 0:
            direction = "Increase" if shock.delta_transfers > 0 else "Reduction"
            changes.append(
                f"{direction} in government transfers by €{abs(shock.delta_transfers):.0f}M"
            )

        if shock.delta_gov_consumption != 0:
            direction = "Increase" if shock.delta_gov_consumption > 0 else "Reduction"
            changes.append(
                f"{direction} in government consumption by €{abs(shock.delta_gov_consumption):.0f}M"
            )

        if shock.delta_gov_investment != 0:
            direction = "Increase" if shock.delta_gov_investment > 0 else "Reduction"
            changes.append(
                f"{direction} in public investment by €{abs(shock.delta_gov_investment):.0f}M"
            )

        if shock.delta_tau_c != 0:
            direction = "increase" if shock.delta_tau_c > 0 else "reduction"
            changes.append(f"Consumption tax {direction} by {abs(shock.delta_tau_c):.1f} p.p.")

        if shock.delta_tau_y != 0:
            direction = "increase" if shock.delta_tau_y > 0 else "reduction"
            changes.append(f"Labor income tax {direction} by {abs(shock.delta_tau_y):.1f} p.p.")

        if not changes:
            changes.append("No significant fiscal policy change detected")

        return changes

    def _build_causal_chain(self, shock, solution) -> list[str]:
        """Build causal chain explanation."""
        chain = []

        first_round = solution["first_round"]
        is_expansion = first_round["gdp_impact_eur_m"] > 0

        if shock.delta_transfers != 0:
            if is_expansion:
                chain.append(
                    "Policy increases household disposable income via transfer payments"
                )
                chain.append("Liquidity-constrained households increase consumption immediately")
                chain.append("Higher consumption demand → firms increase production")
                chain.append("Increased production → more employment and wage income")
                chain.append("Multiplier effects through second-round consumption")
            else:
                chain.append("Policy reduces household disposable income via transfer cuts")
                chain.append("Consumption falls, especially for liquidity-constrained households")
                chain.append("Lower demand → firms reduce production and employment")
                chain.append("Negative multiplier effects through income channels")
                chain.append("Budget balance improves but at cost of output and employment")

        elif shock.delta_gov_consumption != 0 or shock.delta_gov_investment != 0:
            if is_expansion:
                chain.append("Government increases direct purchases of goods and services")
                chain.append("Firms receive additional demand → increase output")
                chain.append("Employment increases to meet production needs")
                chain.append("Higher wages → additional consumption (induced effect)")
                chain.append("Investment responds to output expansion (accelerator)")
            else:
                chain.append("Government reduces purchases → direct demand shock")
                chain.append("Affected sectors reduce production and employment")
                chain.append("Income effects → reduced consumption")
                chain.append("Budget consolidation at expense of short-term growth")

        else:
            chain.append("Policy shock affects economic activity through fiscal channels")
            chain.append("Multiplier effects propagate through economy")
            chain.append("Adjustment occurs gradually over multiple quarters")

        return chain

    def _identify_winners_losers(self, shock, solution) -> tuple[list[str], list[str]]:
        """Identify economic winners and losers from the policy."""
        winners = []
        losers = []

        is_expansion = solution["first_round"]["gdp_impact_eur_m"] > 0

        if is_expansion:
            winners.extend([
                "Households receiving transfers or benefiting from spending",
                "Service sector employment (restaurants, retail, personal services)",
                "Riga region (largest employment concentration)",
                "Government revenue via automatic stabilizers",
            ])
            losers.extend([
                "Fiscal sustainability metrics (higher debt)",
                "Taxpayers (potential future tax burden)",
                "Competing spending priorities (crowding out)",
            ])
        else:
            winners.extend([
                "Government budget balance (deficit reduction)",
                "Long-term fiscal sustainability",
                "Future generations (lower debt burden)",
                "Bond markets (reduced sovereign risk)",
            ])
            losers.extend([
                "Current transfer recipients",
                "Low-income households (higher MPC)",
                "Regions with high social spending dependency (Latgale, Vidzeme)",
                "Service sector employment",
                "Short-term economic growth",
            ])

        return winners, losers

    def _get_investment_explanation(self, year: int) -> str:
        """Get explanation for investment impacts at different horizons."""
        if year == 1:
            return "Immediate public spending adjustment; private sector wait-and-see"
        elif year == 5:
            return "Private investment responds to output changes; FDI adjusts to new equilibrium"
        else:
            return "Full structural adjustment with long-term capital reallocation"
