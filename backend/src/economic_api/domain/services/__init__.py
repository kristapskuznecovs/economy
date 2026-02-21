"""Domain services for economic calculations."""

import random
from datetime import datetime

from ..model.aggregates import SimulationResults
from ..model.value_objects import (
    ConfidenceLevel,
    HorizonImpact,
    InvestmentImpact,
    RegionalImpact,
)


LATVIA_REGIONS = ["Riga", "Pieriga", "Kurzeme", "Zemgale", "Vidzeme", "Latgale"]

REGION_WEIGHTS = {
    "Riga": 0.42,
    "Pieriga": 0.18,
    "Kurzeme": 0.12,
    "Zemgale": 0.09,
    "Vidzeme": 0.10,
    "Latgale": 0.09,
}


class MockSimulationEngine:
    """
    Mock simulation engine for MVP.

    This will be replaced with real SAM-based CGE solver in v1.
    Generates plausible-looking results based on policy text keywords.
    """

    def simulate(self, policy_text: str) -> SimulationResults:
        """
        Generate mock simulation results.

        MVP implementation: Uses keyword detection and random variation.
        v1 implementation: Will use real DSGE/SAM solver.
        """
        # Detect policy direction from keywords
        is_removal = any(word in policy_text.lower() for word in ["remov", "cut", "reduc"])
        sign = -1 if is_removal else 1
        base = 180 + random.random() * 120

        # Generate horizon impacts (1, 5, 15 years)
        horizon_impacts = []
        for year in [1, 5, 15]:
            scale = 1.0 if year == 1 else (2.2 if year == 5 else 3.8)
            horizon_impacts.append(
                HorizonImpact(
                    year=year,
                    budget_balance_eur_m=round(sign * base * 0.3 * scale),
                    revenues_eur_m=round(sign * base * 0.15 * scale),
                    expenditures_eur_m=round(sign * -base * 0.15 * scale),
                    gdp_real_pct=round(sign * 0.3 * scale * 100) / 100,
                    employment_jobs=round(sign * 2200 * scale),
                    inflation_pp=round(sign * 0.1 * scale * 100) / 100,
                )
            )

        # Generate regional impacts
        regional_impacts = []
        for year in [1, 5, 15]:
            scale = 1.0 if year == 1 else (2.2 if year == 5 else 3.8)
            for region in LATVIA_REGIONS:
                weight = REGION_WEIGHTS[region]
                jobs = round(sign * 2200 * scale * weight)
                regional_impacts.append(
                    RegionalImpact(
                        area=region,
                        year=year,
                        gdp_real_pct=round(sign * 0.3 * scale * weight * 100) / 100,
                        employment_jobs=jobs,
                        income_tax_eur_m=round(sign * base * 0.05 * scale * weight),
                        social_spending_eur_m=round(base * 0.08 * scale * weight),
                        direction="increase" if jobs > 0 else ("decrease" if jobs < 0 else "neutral"),
                    )
                )

        # Generate investment impacts
        investment_impacts = []
        for year in [1, 5, 15]:
            scale = 1.0 if year == 1 else (1.8 if year == 5 else 2.5)
            pub = round(sign * base * 0.4 * scale)
            priv = round(sign * base * 0.25 * scale)
            fdi = round(sign * base * 0.15 * scale)
            total = pub + priv + fdi

            if year == 1:
                explanation = "Immediate public spending adjustment with limited private sector response"
            elif year == 5:
                explanation = "Private sector adapts, FDI begins responding to policy signals"
            else:
                explanation = "Full structural adjustment with long-term investment reallocation"

            investment_impacts.append(
                InvestmentImpact(
                    year=year,
                    public_investment_eur_m=pub,
                    private_investment_eur_m=priv,
                    fdi_investment_eur_m=fdi,
                    total_investment_eur_m=total,
                    direction="increase" if total > 0 else "decrease",
                    explanation=explanation,
                )
            )

        # Build complete results
        return SimulationResults(
            scenario_id=f"scn_{int(datetime.utcnow().timestamp())}",
            title=policy_text[:60] + "..." if len(policy_text) > 60 else policy_text,
            policy_changes=[
                (
                    "Removal/reduction of targeted fiscal instrument"
                    if is_removal
                    else "Introduction/expansion of fiscal measure"
                ),
                "Adjustment to social transfer mechanisms",
                "Secondary effect on labor market participation",
            ],
            horizon_impacts=horizon_impacts,
            regional_impacts=regional_impacts,
            investment_impacts=investment_impacts,
            model_name="Latvia DSGE Fiscal Model (Mock)",
            model_version="0.1.0-mvp",
            confidence=ConfidenceLevel.MEDIUM,
            assumptions=[
                "EU growth baseline of 1.8% annually",
                "Stable monetary policy (ECB rates unchanged)",
                "No major external shocks",
                "Linear scaling of regional effects",
            ],
            caveats=[
                "MVP uses simplified mock model - results are illustrative only",
                "Model does not capture behavioral migration effects",
                "Regional multipliers are approximated from national data",
                "Long-term projections carry increasing uncertainty",
            ],
            causal_chain=[
                (
                    "Policy removes existing fiscal instrument → reduces transfer payments"
                    if is_removal
                    else "Policy introduces new fiscal measure → increases public spending"
                ),
                "Direct effect on household disposable income",
                "Secondary consumption effects through multiplier channels",
                "Labor market adjustment over medium term",
                "Long-term structural shift in savings and investment patterns",
            ],
            key_drivers=[
                "Fiscal multiplier effect (1.2–1.6x depending on instrument)",
                "Regional concentration of affected population",
                "Labor market elasticity in service sectors",
                "EU co-financing leverage ratio",
            ],
            winners=(
                [
                    "Government budget balance",
                    "Taxpayers (lower future obligations)",
                    "Fiscal sustainability metrics",
                ]
                if is_removal
                else [
                    "Direct beneficiaries of spending",
                    "Service sector employment",
                    "Regional economies",
                ]
            ),
            losers=(
                [
                    "Current benefit recipients",
                    "Consumer spending in affected regions",
                    "Social service employment",
                ]
                if is_removal
                else [
                    "Taxpayers (higher obligations)",
                    "Budget deficit",
                    "Competing spending priorities",
                ]
            ),
        )
